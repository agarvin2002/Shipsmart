FROM node:16-alpine

WORKDIR /app

COPY package.json lerna.json ./
COPY packages ./packages
COPY service ./service

RUN yarn install --frozen-lockfile
RUN yarn bootstrap

EXPOSE 3000

CMD ["yarn", "start"]
