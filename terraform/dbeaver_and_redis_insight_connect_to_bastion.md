> **NOTE**
> everywhere you see 13.244.97.170 = bastion-ec2-ip, replace with your own

## Postgres: Connecting to the bastion with dbeaver

1. Test if bastion-EC2 can talk to the rds instance internally
  - ssh into the ec2 bastion:
    ```bash
    # ssh into instance
    ssh -i ~/.ssh/terraform/free9ja/pgsql_redis_rsa ec2-user@13.244.97.170

    # install nc to test connection to the rds dns
    sudo dnf install -y nc
    nc -zv free9ja-staging-db.jd.af-south-1.rds.amazonaws.com 5432 {i.e nc -zv <rds-dns> <rds-port>}
    ```
    -- if the above is successful, then move on to the next steps
    
    ```bash
    # install postgres
    sudo dnf install -y postgresql15

    # run postgres command connecting to the database
    psql \
      -h free9ja-staging-db.cxoqcesa4mo3.af-south-1.rds.amazonaws.com \
      -U postgres \
      -d free9ja_staging
    ```
    -- if the above succeed, then you know all is well

2. Go to dbeaver and setup the connection:
  - Click on `[database]` > `[New database connection]`
  - select postgres:
    connected by: Host
      Host: `free9ja-staging-db.jd.af-south-1.rds.amazonaws.com` {i.e. rds-dns}
      Port: `5432` {i.e. rds-port}
      Database: `free9ja_staging` {i.e. db-name}
      User: `postgres` {i.e. db-username}
      Password: `{your db-password}`

  - switch to the ssh tab, at the right hand side, you'll see a dropdown that will allow you add ssh settings:
      Host: `13.244.97.170` {i.e. bastion-ec2-ip}
      Port: `22`
      User: `ec2-user` {i.e. ec2-user}
      Authentication Method: `Public Key`
      Private Key: `~/.ssh/terraform/free9ja/pgsql_redis_rsa` {i.e. path to your private key}

  - switch to `[Driver properties]` tab
    - scroll and find sslmode
      - set the value to "require"

  - Click test connection, save and connect.

## Redis: Connecting to the bastion with redis-insight

1. Test if bastion-EC2 can talk to the redis elasticache instance internally
  - ssh into the ec2 bastion:
    ```bash
    # ssh into instance
    ssh -i ~/.ssh/terraform/free9ja/pgsql_redis_rsa ec2-user@13.244.97.170

    # install nc to test connection to the rds dns
    sudo dnf install -y nc
    nc -zv free9ja-staging-redis.89oadg.0001.afs1.cache.amazonaws.com 6379 {i.e nc -zv <redis-dns> <redis-port>}
    ```
    : if the above is successful, then move on to the next steps

    ```bash
    # install redis client
    sudo dnf install -y redis6

    # run redis command connecting to the database
    redis6-cli \
      -h free9ja-staging-redis.89oadg.0001.afs1.cache.amazonaws.com \
      -p 6379 \
      ping
    ```
    : if the above returns PONG, then you know all is well

2. We will use ssh redirecting from system to the bastion
  - we do:
    ```bash
    ssh -i ~/.ssh/terraform/free9ja/pgsql_redis_rsa \
      -L 6380:free9ja-staging-redis.89oadg.0001.afs1.cache.amazonaws.com:6379 \
      ec2-user@13.244.97.170
    ```

    i.e `ssh -i <private-key-path> -L <local-port>:<remote-host>:<remote-port> <bastion-ec2-user>@<bastion-ec2-ip>`
    : if you noticed we're listening on our localhost:6380 instead of 6379 to avoid conflict with local redis docker containers

  - then on redis-insight:
    - open redis-insight, in the `[connection URL]` add this: `redis://default@127.0.0.1:6380`
    - click `[test connection]`
    - if above is okay, then click `[Add database]`

## on the ec2-instance
  - just like the apt-get or apt in ubuntu linux, amazon linux is a little bit different:
  1. Show all installed packages
    ```bash
    dnf list installed
    dnf list installed | grep postgres
    ```

  2. Show all available packages from enabled repositories
    ```bash
    dnf list available
    dnf list all - Show both installed and available packages
    ```
  
  3. Show details about a specific package
    ```bash
    dnf info postgresql15
    ```

  4. Search package by name, or description
    ```bash
    dnf search nc
    ```

  5. Remove a package (with its dependencies)
    ```bash
    sudo dnf remove ncurses
    ```
  
  5. See packages installed recently via DNF
    ```bash
    dnf history list
    ```

  6. Check if PostgreSQL 15 is installed
    ```bash
    dnf list installed postgresql15
    ```

  7. install postgres
    ```bash
    sudo dnf install -y postgresql15
    ```
