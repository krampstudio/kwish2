FROM node:8.4.0 

# Add the RethinkDB repository and public key
# "RethinkDB Packaging <packaging@rethinkdb.com>" http://download.rethinkdb.com/apt/pubkey.gpg
RUN apt-key adv --keyserver keys.gnupg.net --recv-keys 3B87619DF812A63A8C1005C30742918E5C8DA04A
RUN echo "deb http://download.rethinkdb.com/apt jessie main" > /etc/apt/sources.list.d/rethinkdb.list

ENV RETHINKDB_PACKAGE_VERSION 2.3.6~0jessie

RUN apt-get update \
	&& apt-get install -y rethinkdb=$RETHINKDB_PACKAGE_VERSION \
	&& rm -rf /var/lib/apt/lists/*

VOLUME ["/data"]

WORKDIR /data



# confirm installation
RUN node -v
RUN npm -v

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json .
COPY package.json package-lock.json ./

RUN npm install

# Bundle app source
COPY . .

EXPOSE 8080
CMD ["npm", "start"]