"""Controls sibling microservice containers via the Docker Engine API.

Requires the container this runs in to have /var/run/docker.sock mounted - see this
service's Dockerfile/README for the security implications (docker.sock access is
equivalent to root on the host) and mitigations (docker socket proxy, network policy).
"""


class DockerManager:
    def __init__(self):
        import docker

        self._client = docker.from_env()
        self._not_found = docker.errors.NotFound

    def status(self, container_name: str) -> str:
        try:
            return self._client.containers.get(container_name).status
        except self._not_found:
            return "not_found"

    def enable(self, container_name: str) -> str:
        try:
            self._client.containers.get(container_name).start()
        except self._not_found:
            return "not_found"
        return self.status(container_name)

    def disable(self, container_name: str) -> str:
        try:
            self._client.containers.get(container_name).stop()
        except self._not_found:
            return "not_found"
        return self.status(container_name)

    def restart(self, container_name: str) -> str:
        try:
            self._client.containers.get(container_name).restart()
        except self._not_found:
            return "not_found"
        return self.status(container_name)
