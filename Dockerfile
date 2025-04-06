FROM node:14

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 6974

CMD ["npm", "start"]
