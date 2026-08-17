---===Initial Setup===---
Before running the project ensure you have the following external programs.
1. Docker Desktop; https://www.docker.com/products/docker-desktop/
    * From here, pull OpenZipkin: https://hub.docker.com/r/openzipkin/zipkin/
    * Start it to make sure it launches and go to http://localhost:9411/zipkin/
      If the page loads after a few seconds of the container running, then the container is working properly. Stop it before continuing.
2. PostgreSQL Server: https://www.postgresql.org/
    * You will probably want pgAdmin as well; the installation comes with it.
    * On install, create a user with the ability to modify database contents. Make sure they have a password that you'll remember. This user will be used by Prisma to access the database and execute queries.
    * Create a new database with some arbitrary name. Ensure the user you created is the owner of the database.
3. Node.JS: https://nodejs.org/en/download
    * This will install both Node.JS and npm.
4. Visual Studio Code: https://code.visualstudio.com/
    * This is not necessarily required but is what the project was written in.
    * If you use another IDE you're on your own!
    * You should also grab the official Prisma extension for syntax highlighting and other conveniences. Its ID is "Prisma.prisma".
5. Postman: https://www.postman.com/
    * Postman is free!
    * You may use any other API tester; this one is just preferred.


---===Project Installation and Setup===---
1. Extract the contents of the ZIP file into a NEW VSCode project.
2. Open VSCode's integrated terminal and run "npm install" without quotes to install all the dependencies; this may take a few minutes!
3. Verify that Prisma has installed by running "npx prisma"; if no error occurs, Prisma has successfully installed.
4. Go to .env in the root directory of the project;
    * Replace the text value with the connection address to your PostgreSQL database and application. This is in the form of...

    postgresql://USER:PASSWORD@HOST:PORT/DATABASE
    Where USER is your PostgreSQL user (e.g. "johndoe" or "postgres")
    Where PASSWORD is the EXACT password you provided the user on installation.
    Where HOST is where the database is hosted (most likely "localhost")
    Where PORT is the port that PostgreSQL is running on (typically 5432 or 5433)
        * You can find this by right-clicking PostgreSQL in pgAdmin then going Properties > Connection > Port
    Where DATABASE is the name of your database.
        * Prisma's official documentation requires you specify your schema; as this project uses many schemas this is unnecessary.
5. In the integrated terminal, run "npx prisma db push". If it works, you will be told that your database is now in sync with your Prisma schema file.
    * You may want to implement Prisma Migrate to version your database schema Git style; https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/overview
6. Now, attempt to launch all the microservices with the package script "npm run startAll".
    * This will take a bit to run as various express sessions need to start...
    * If this executes successfully (no errors, long line of "listening" prints), then the services should be running.
7. To ensure traces are being logged, open Postman and send an empty GET request to "localhost:5000/DEBUG". This should produce a dummy reply.
    * Open "localhost:9411/zipkin/" in a browser (make sure the container is running). If this works, you should see a trace posted to Zipkin with three spans.
    * If there are only two, send a request again; the first request has a fair chance of dropping the first span due to an issue with instrumentation.

If you have gotten this far, the project is now running and you can collect traces.

---===Making Microservices===---
To make a microservice...
1. Under service, copy the DUMMY_SERVICE.js file somewhere into the micros folder.
2. Under config, in default.json, define a port as shown in the folder. 
    Remember that this is a JSON object, so you will need to obey said format. 
    Microservices should not share ports.
3. Make sure your service's MY_NAME_IS folder matches the name you put in the config folder.
4. You can immediately launch the service with "node yourServiceName.js", but we would
    like to launch the service alongside others. You can accomplish this by opening 
    package.json and adding the launch command to the list in the form...

    "serviceName" : "node yourServiceName.js"

    Note that you can create composite commands and composite commands of composite commands;
    follow the format shown in package.json.
