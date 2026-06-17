import httpx
from typing import Any, Dict, List, Optional

class MemoxClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url

    def write(
        self,
        session_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """
        Synchronously write memory payload to the REST API server.
        """
        payload = {
            "sessionId": session_id,
            "content": content,
            "metadata": metadata,
            "ttl_seconds": ttl_seconds
        }
        
        with httpx.Client() as client:
            response = client.post(f"{self.base_url}/v1/memory/write", json=payload)
            response.raise_for_status()
            res_json = response.json()
            return res_json.get("success", False)

    async def awrite(
        self,
        session_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """
        Asynchronously write memory payload to the REST API server.
        """
        payload = {
            "sessionId": session_id,
            "content": content,
            "metadata": metadata,
            "ttl_seconds": ttl_seconds
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/v1/memory/write", json=payload)
            response.raise_for_status()
            res_json = response.json()
            return res_json.get("success", False)

    def load(
        self,
        session_id: str,
        query: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Synchronously load memory context from the REST API server.
        """
        payload = {
            "sessionId": session_id,
            "query": query,
            "limit": limit
        }
        
        with httpx.Client() as client:
            response = client.post(f"{self.base_url}/v1/memory/load", json=payload)
            response.raise_for_status()
            res_json = response.json()
            return res_json.get("memories", [])

    async def aload(
        self,
        session_id: str,
        query: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Asynchronously load memory context from the REST API server.
        """
        payload = {
            "sessionId": session_id,
            "query": query,
            "limit": limit
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/v1/memory/load", json=payload)
            response.raise_for_status()
            res_json = response.json()
            return res_json.get("memories", [])


class MemoxRunnable:
    """
    A LangChain Runnable wrapper for memox that enables pipeline integration.
    """
    def __init__(self, client: MemoxClient, session_id: str, action: str = "write"):
        self.client = client
        self.session_id = session_id
        self.action = action

    def invoke(self, input: str, config: Optional[Dict[str, Any]] = None) -> Any:
        """
        Invoked as part of a LangChain chain execution.
        """
        if self.action == "write":
            self.client.write(self.session_id, input)
            return input
        else:
            return self.client.load(self.session_id, input)

    async def ainvoke(self, input: str, config: Optional[Dict[str, Any]] = None) -> Any:
        """
        Asynchronously invoked as part of a LangChain chain execution.
        """
        if self.action == "write":
            await self.client.awrite(self.session_id, input)
            return input
        else:
            return await self.client.aload(self.session_id, input)
