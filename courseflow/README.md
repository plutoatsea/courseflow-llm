# Setup

## *USED a fork of the Courseflow APP **(stable-test2 history branch)***

---

## Setup Production Environment

**Execute the following inside the project repo**:

### *Important*

*local_settings.py **MUST** be present in the repo (GO TO STEP 8)*

*Run Docker Compose*
```
docker compose up
```

The idea of how the llm setup will work:

**The following commands need to be executed in seperate terminals**

- Execute `docker compose up` inside the llm directory
- Execute `docker compose up` inside the courseflow directory

---

## Setup Dev Environment

#### The following steps will setup a dev environment for CourseFlow.

*Make sure to use the following versions or else the installation **will fail**.*

Python Version : **3.8**
Node Version: **14**

1. Create Virtual Environment: 
    ```
    python3.8 -m venv dev_venv
    ```
2.  Activate Environment: 
    ```
    source dev_venv/bin/activate
    ```
3. Install all required python dependencies: 
    ```
    pip install -r requirements/requirements.txt
    ```
4. Install Node Modules: 
    ```
    yarn install | npm i
    ``` 
5. Build minified JS files:
    ```
    yarn run gulp build-js | ./node_modules/gulp/bin/gulp.js build-js
    ```
6. Migrate (Basically it creates and allocates all necessary DBs):
```
    python3.8 course_flow.py migrate
    ```
7. If you don't have a local_settings.py set up, **change line 25 in settings.py** to:

    ```
    DEBUG = True
    ```
-> This settings enables a HTML view component that displays errors if there is any inside development.
![404](<./images/Pasted image 20250407145537.png>)

8. Create `local_settings.py` inside the root of the project:
```python
import sys
import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEBUG=True

#CHROMEDRIVER_PATH='/mnt/c/Program Files/Google/Chrome/Application/chromedriver.exe'
CHROMEDRIVER_PATH="nopath"
COURSEFLOW_TEST_HEADLESS=False
COURSEFLOW_TEST_BROWSER="chrome"

using_venv = True

if not using_venv:
    COURSEFLOW_TEST_BROWSER = "ff"
    CELERY_BROKER_URL = "redis://cf-redis:6379"
    CELERY_RESULT_BACKEND = "redis://cf-redis:6379"

    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [("cf-redis", 6379)]},
        },
    }

CSP_INCLUDE_NONCE_IN = [
    "script-src",
    "style-src",
] 


INTERNAL_IPS = [
    '127.0.0.1',
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
        "TEST": {
            "NAME": os.path.join(BASE_DIR, "db_test.sqlite3"),
        },
        "OPTIONS": {"timeout": 20},
    },
}

#
#DATABASES = {
#    "default": {
#        "ENGINE": "django.db.backends.mysql",
#        "NAME": "testmysqldb",
#        "OPTIONS": {
#        },
#        'USER': 'testmysqldbuser',
#        'PASSWORD': 'testmysqldbuser',
#        'HOST': 'localhost',
#        'PORT': '',
#    }
#}

SECRET_KEY="TEST"

# LOCAL_APPS = ("sslserver",)

# if "runsslserver" in sys.argv:

#     SSL_CONTEXT = True

#     SECURE_HSTS_SECONDS = 3600

# else:

#     SSL_CONTEXT = False

#     SECURE_HSTS_SECONDS = 0

#     CSRF_COOKIE_NAME = "csrftoken"

# CSRF_COOKIE_SECURE = SSL_CONTEXT

# SECURE_SSL_REDIRECT = SSL_CONTEXT

# SESSION_COOKIE_SECURE = SSL_CONTEXT

# CSP_UPGRADE_INSECURE_REQUESTS = SSL_CONTEXT
```

9. Create a SuperUser Account (Admin)
```
python course_flow.py createsuperuser
```

10. Run Redis in another terminal (Install Redis Before Because it handles DB Processes)

```
redis-server
```

11. Run Django Server
    
```
python3 course_flow.py runserver
```
    
12. Navigate to the following link, create the “Teacher” group, and assign your superuser to this group.

    ```
    127.0.0.1:8000/admin
    ```

13. Login to the superuser

    ```
    127.0.0.1:8000/login
    ```

Home View Looks like this:
![Home](<./images/Pasted image 20250407150542.png>)

Library View:
![Library](<./images/Pasted image 20250407150654.png>)

Explore View:
![Explore](<./images/Pasted image 20250407150654-1.png>)

14.  Seed inside the DB Strategies
```
python3 course_flow.py create_saltise_strategies
```
![Strategies](<./images/Pasted image 20250407152018.png>)
![Detailed Strategy](<./images/Pasted image 20250407151922.png>)

15.  Seed inside the DB Disciplines
```
python3 course_flow.py create_base_disciplines
```
-> Should Create A List of Disciplines as a filter
![Disciplines](<./images/Pasted image 20250407154623.png>)

16. For testing before commits, run:

```
(dev_venv) python3 course_flow.py test
```

or:

```
(dev_venv) pytest
```

# CourseFlow - ORIGINAL

[![CircleCI](https://circleci.com/gh/SALTISES4/CourseFlow.svg?style=svg)](https://circleci.com/gh/SALTISES4/CourseFlow)

CourseFlow is a pedagogical tool for planning activities, courses, and programs, which is designed to enable Research Practice Partnerships between instructors, designers, and researchers.

## Setting up the development server

1.  Set up a virtualenv.

        python3 -m venv dev_venv

2.  Activate the virtualenv.

        source dev_venv/bin/activate

3.  Install the requirements.

        (dev_venv) pip install -r requirements.txt

4.  Install pre-commit (optional).

        pre-commit install

5.  Install node modules.

        yarn install | npm i

6.  Build minified JS files.

        yarn run gulp build-js | ./node_modules/gulp/bin/gulp.js build-js

7.  Migrate

        (dev_venv) python3 course_flow.py migrate

8.  If you don't have a local_settings.py set up, change line 25 in settings.py to:

        DEBUG = True

9.  Run the Django development server.

        (dev_venv) python3 course_flow.py runserver

10. Register at:

        127.0.0.1:8000/register

11. Create default strategies and disciplines.

        (dev_venv) python3 course_flow.py create_saltise_strategies
        (dev_venv) python3 course_flow.py create_base_disciplines

12. For testing before commits, run:

        (dev_venv) python3 course_flow.py test

    or:

        (dev_venv) pytest

13. To package a version:

        tox --recreate
        
14. When using in another project:

        add a COURSE_FLOW_RETURN_URL value to your settings.py