# ErfgoedPod prototype

This is a prototype application for the ErfgoedPod Project. It implements two interactions between decentralized network participants:
- A Cultural Heritage Institution (data node) registers a dataset with the Dataset Register (service node)
- A Cultural Heritage Institution (data node) informs the Network of Terms (service node) about a link to a term in order to to create a backlink.

This prototype is build using:
- [Docker compose](https://docs.docker.com/compose/)
- [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer)
- Typescript and the [evno](https://github.com/ErfgoedPod/evno) library

## What's in the box?

This prototypes implements a data node and a couple of service nodes:

- `./datanode`: A data node mimicking a Cultural Heritage Institution.
- `./dataset-register-proxy`: A service node proxy for the dataset register API.
- `./servicenode`: A dummy service node application that illustrates the main functions of a service node.

Each of the node applications uses a Solid Pod for their inbox or artifacts. These pods are hosted with the Community Solid Server. Its configuration files are in `./podserver`.

## How to run?

Use docker compose to start you small network:

```
export CA_CERT_DIR=$(mkcert -CAROOT) 
docker compose down --remove-orphans # if needed to stop all running containers
docker compose build
docker compose up --no-build
```

You'll need some environment variables to supply account information and the locations of inboxes. Below is an example .env file:

```
# Agent 1
DN_POD=https://podserver:3001/datanode/
DN_NAME=Stadsarchief Amsterdam
DN_EMAIL=agent1@example.com
DN_PASSWORD=password
DN_INBOX=https://podserver:3001/datanode/inbox/

# Agent 2
SN_POD=https://podserver:3001/servicenode/
SN_NAME=Termennetwerk
SN_EMAIL=agent2@example.com
SN_PASSWORD=password
SN_INBOX=https://podserver:3001/servicenode/inbox/

# Agent 3
R_POD=https://podserver:3001/register/
R_NAME=Dataset Register
R_EMAIL=agent3@example.com
R_PASSWORD=password
R_INBOX=https://podserver:3001/register/inbox/

REGISTER=http://registry:3000
AGENTS=https://podserver:3001/servicenode/profile/card#me,https://podserver:3001/datanode/profile/card#me,https://podserver:3001/register/profile/card#me
```
