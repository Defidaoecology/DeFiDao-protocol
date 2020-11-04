FROM mhart/alpine-node:13.8.0

RUN apk update && apk add --no-cache --virtual build-dependencies git python g++ make
RUN wget https://github.com/ethereum/solidity/releases/download/v0.5.16/solc-static-linux -O /bin/solc && chmod +x /bin/solc

RUN mkdir -p /DeFiDao-protocol
WORKDIR /DeFiDao-protocol

# First add deps
ADD ./package.json /DeFiDao-protocol
ADD ./yarn.lock /DeFiDao-protocol
RUN yarn install --lock-file

# Then rest of code and build
ADD . /DeFiDao-protocol

ENV SADDLE_SHELL=/bin/sh
ENV SADDLE_CONTRACTS="contracts/*.sol contracts/**/*.sol"
RUN npx saddle snkile

RUN apk del build-dependencies
RUN yarn cache clean

CMD while :; do sleep 2073600; done
