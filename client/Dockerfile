FROM node:13.14.0-buster

# install client npm dependencies
WORKDIR /usr/app/client
COPY ./package.json .
RUN npm install
COPY . .
CMD ["npm", "start"]
