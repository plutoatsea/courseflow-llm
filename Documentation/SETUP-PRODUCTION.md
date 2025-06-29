# Production Setup

**All instructions are in the README.md files on both `/llm & /courseflow` folders.**

*Dawson College Server Production IP:* **N/A**

*User:* **saltise**    -  *Password:* **N/A**

1. *Connect to [Forticlient VPN](https://www.dawsoncollege.qc.ca/information-systems-and-technology/articles/virtual-private-network-vpn/) (Dawson College VPN)*

2. Setup the production environnments following /llm & /courseflow `README.md`.

3. Zip both files into seperate names.

4. Transfer the compressed files directly to the server.

    *Method used to transfer folders to a specific machine:*    
    ```
     scp "artifacts(1).zip" <user>@<ip>:
    ```

5. Unzip files to the home directory. If there are dupes replace them with new files.

    ```
     unzip file.zip
    ```

6. Open 2 seperate terminals and execute the docker compose for both files.

    ```
     cd ./llm/ & sudo docker compose up
    ```
    ```
     cd ./courseflow/ & sudo docker compose up
    ```

If you wish to stop the docker compose:

    ```
     cd ./llm/ & sudo docker compose stop
    ```
    ```
     cd ./courseflow/ & sudo docker compose stop
    ```

--- 

## (SKIP STEP) Adding Configs to restart Docker Services if server FAILS/REBOOTS

*These steps are already made in the Dawson server. But, I provided steps in case anything happens.*

1. Add permissions to $USER

    ```bash
    sudo usermod -aG docker $USER
    newgrp docker
    ```

2. Create `llm.service` file & Insert the following information

    ```bash
    sudo vim /etc/systemd/system/llm.service
    ```
    ```bash
    [Unit]
    Description=LLM Docker Compose Service
    After=docker.service
    Requires=docker.service

    [Service]
    Type=simple
    WorkingDirectory=/home/saltise/llm
    ExecStartPre=/usr/bin/docker compose down
    ExecStart=/usr/bin/docker compose up
    ExecStop=/usr/bin/docker compose down
    Restart=on-failure
    RestartSec=30s
    User=saltise
    Group=docker
    Environment="PATH=/usr/bin:/bin:/usr/local/bin"

    [Install]
    WantedBy=multi-user.target
    ```

3. Create `courseflow.service` file & Insert the following information

    ```bash
    sudo vim /etc/systemd/system/courseflow.service
    ```
    ```bash
    [Unit]
    Description=Courseflow Docker Compose Service
    After=docker.service
    Requires=docker.service

    [Service]
    Type=simple
    WorkingDirectory=/home/saltise/courseflow
    ExecStartPre=/usr/bin/docker compose down
    ExecStart=/usr/bin/docker compose up
    ExecStop=/usr/bin/docker compose down
    Restart=on-failure
    RestartSec=30s
    User=saltise
    Group=docker
    Environment="PATH=/usr/bin:/bin:/usr/local/bin"

    [Install]
    WantedBy=multi-user.target
    ```

4. Reload, Stop & Start Services

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl stop llm.service courseflow.service
    sudo systemctl start llm.service courseflow.service
    ```
    **Make sure the services work**

5. Enable on Boot services

    ```bash
    sudo systemctl enable llm.service courseflow.service
    ```

If you want to check a service condition (logs):
    
```bash
journalctl -u llm.service -f
```
