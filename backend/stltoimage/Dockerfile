FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN printf "deb http://archive.debian.org/debian/ jessie main\ndeb-src http://archive.debian.org/debian/ jessie main\ndeb http://security.debian.org jessie/updates main\ndeb-src http://security.debian.org jessie/updates main" > /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y build-essential g++ libcairo2-dev libgif-dev libjpeg62-turbo-dev libpango1.0-dev
RUN npm install


# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 5672 
CMD [ "npm", "start" ]
