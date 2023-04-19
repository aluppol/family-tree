project/
├── src/
│   ├── api/
│   │   ├── people_service/
│   │   │   ├── manage.py
│   │   │   ├── people_service/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── settings.py
│   │   │   │   ├── urls.py
│   │   │   │   └── wsgi.py
│   │   │   ├── requirements.txt
│   │   │   └── Dockerfile
│   │   ├── auth_service/
│   │   │   ├── manage.py
│   │   │   ├── auth_service/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── settings.py
│   │   │   │   ├── urls.py
│   │   │   │   └── wsgi.py
│   │   │   ├── requirements.txt
│   │   │   └── Dockerfile
│   │   └── nginx/
│   │       ├── nginx.conf
│   │       └── Dockerfile
│   └── ui/
│       ├── public/
│       │   ├── index.html
│       │   └── ...
│       └── src/
│           ├── App.js
│           └── ...
├── data/
│   ├── db.sqlite3
│   ├── postgres/
│   ├── mongo/
│   └── redis/
├── env/
│   ├── api.env
│   └── ui.env
├── ansible/
│   ├── inventory.ini
│   ├── playbook.yml
│   └── roles/
│       ├── common/
│       │   └── tasks/
│       │       └── main.yml
│       ├── api/
│       │   └── tasks/
│       │       └── main.yml
│       ├── ui/
│       │   └── tasks/
│       │       └── main.yml
│       └── nginx/
│           └── tasks/
│               └── main.yml
└── docker-compose.yml
