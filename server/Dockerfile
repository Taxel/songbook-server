FROM node:13.14.0-buster
RUN apt-get update
RUN apt-get install -y luatex
RUN apt-get install -y lilypond
RUN apt-get install -y python3-pip
RUN pip3 install colorama
# copy only package.json files before npm install -> image can be cached as long as no packages were changed
# install server npm dependencies
WORKDIR /usr/app/server
COPY ./package.json .
RUN npm install
# copy source code
COPY . .
CMD ["npm", "start"]
