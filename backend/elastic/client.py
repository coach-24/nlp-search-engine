from threading import Lock

from elasticsearch import Elasticsearch

from utils.config import settings

_es_client: Elasticsearch | None = None
_es_client_lock = Lock()


def _build_es_client() -> Elasticsearch:
    client_kwargs = {
        "hosts": [settings.es_host],
        "request_timeout": settings.es_request_timeout,
        "retry_on_timeout": True,
        "max_retries": 3,
    }

    if settings.es_host.startswith("https://"):
        client_kwargs["verify_certs"] = settings.es_verify_certs
        if not settings.es_verify_certs:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    if settings.es_username and settings.es_password:
        client_kwargs["basic_auth"] = (settings.es_username, settings.es_password)

    return Elasticsearch(**client_kwargs)


def get_es_client() -> Elasticsearch:
    global _es_client

    if _es_client is not None:
        return _es_client

    with _es_client_lock:
        if _es_client is None:
            candidate = _build_es_client()
            if not candidate.ping():
                candidate.close()
                raise ConnectionError("Cannot connect to Elasticsearch. Check if it is running.")
            _es_client = candidate

    return _es_client


def close_es_client() -> None:
    global _es_client

    with _es_client_lock:
        if _es_client is None:
            return
        _es_client.close()
        _es_client = None
