def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "handee-agents"


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "running" in data["message"].lower()

