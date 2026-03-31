import axios from 'axios';
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';
import protobuf from 'protobufjs';


const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

const restClient = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 10000,
});

const graphqlClient = new ApolloClient({
    link: new HttpLink({
        uri: `${BASE_URL}/graphql`,
    }),
    cache: new InMemoryCache(),
});

export const createGameGraphQL = async (gameDto, imageUrl) => {
    const CREATE_GAME_MUTATION = gql`
        mutation Create($input: GameCreateDtoInput!, $url: String!) {
            createGame(input: $input, imageUrl: $url) {
                id
                name
                price
            }
        }
    `;

    const start = performance.now();

    const { data } = await graphqlClient.mutate({
        mutation: CREATE_GAME_MUTATION,
        variables: {
            input: {
                name: gameDto.name,
                genre: gameDto.genre,
                price: gameDto.price,
                platform: gameDto.platform,
                description: gameDto.description,
                rating: gameDto.rating
            },
            url: imageUrl
        }
    });

    const duration = performance.now() - start;
    return { data: data.createGame, duration };
};

export const createGameGRPC = async (gameDto, imageUrl) => {
    const root = await protobuf.load("/game.proto");
    const CreateRequest = root.lookupType("CreateGameRequest");

    const payload = {
        name: gameDto.name,
        genre: gameDto.genre,
        price: Math.floor(Number(gameDto.price)) || 0,
        imageUrl: imageUrl,
        platform: gameDto.platform,
        description: gameDto.description,
        rating: parseFloat(gameDto.rating) || 0
    };

    const errMsg = CreateRequest.verify(payload);
    if (errMsg) throw Error(errMsg);
    const buffer = CreateRequest.encode(CreateRequest.create(payload)).finish();

    const start = performance.now();

    const response = await fetch(`${BASE_URL}/GameGrpc/CreateGame`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/grpc-web+proto',
            'X-Grpc-Web': '1'
        },
        body: buffer
    });

    const duration = performance.now() - start;
    return { success: response.ok, duration };
};

// Hàm đóng gói dữ liệu gRPC-Web
const frameRequest = (buffer) => {
    const frame = new Uint8Array(5 + buffer.length);
    frame[0] = 0;
    const len = buffer.length;
    frame[1] = (len >> 24) & 0xFF;
    frame[2] = (len >> 16) & 0xFF;
    frame[3] = (len >> 8) & 0xFF;
    frame[4] = len & 0xFF;
    frame.set(buffer, 5);
    return frame;
};

export const runBenchmark = async (type) => {
    const start = performance.now();
    try {
        if (type === 'REST') {
            await restClient.get('/games');
        }
        else if (type === 'GraphQL') {
            await graphqlClient.query({
                query: gql`query { games { id name genre } }`,
                fetchPolicy: 'no-cache'
            });
        }
        else if (type === 'gRPC') {
            const root = await protobuf.load("/game.proto");
            const EmptyRequest = root.lookupType("EmptyRequest");
            const framedPayload = frameRequest(EmptyRequest.encode({}).finish());

            await fetch(`${BASE_URL}/GameGrpc/GetAllGames`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/grpc-web+proto',
                    'X-Grpc-Web': '1'
                },
                body: framedPayload
            });
        }

        return performance.now() - start;
    } catch (error) {
        console.error(`Error testing ${type}:`, error);
        return 0;
    }
};

export { restClient };