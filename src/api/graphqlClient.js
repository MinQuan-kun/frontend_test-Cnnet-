import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

const client = new ApolloClient({
    link: new HttpLink({ uri: `${BASE_URL}/graphql` }),
    cache: new InMemoryCache(),
});

// GraphQL Client cho BallSquare (Territory Battle) telemetry
const BALLSQUARE_URL = import.meta.env.VITE_BALLSQUARE_URL || "http://localhost:4000";
const ballSquareClient = new ApolloClient({
    link: new HttpLink({ uri: `${BALLSQUARE_URL}/graphql` }),
    cache: new InMemoryCache(),
});

export const ballSquareGraphqlApi = {
    fetchLeaderboard: (limit = 5) => {
        const QUERY = gql`
            query Leaderboard($limit: Int) {
                leaderboard(limit: $limit) {
                    rank
                    playerId
                    playerName
                    totalMatches
                    wins
                    winRate
                    avgTerritory
                }
            }
        `;

        return ballSquareClient.query({
            query: QUERY,
            variables: { limit },
            fetchPolicy: 'no-cache',
        });
    },

    fetchPlayerStats: (playerId) => {
        const QUERY = gql`
            query PlayerStats($playerId: ID!) {
                playerStats(playerId: $playerId) {
                    playerId
                    playerName
                    totalMatches
                    wins
                    losses
                    ties
                    winRate
                    avgTerritory
                    lastPlayed
                }
            }
        `;

        return ballSquareClient.query({
            query: QUERY,
            variables: { playerId },
            fetchPolicy: 'no-cache',
        });
    },

    saveMatchResult: (input) => {
        const MUTATION = gql`
            mutation SaveMatchResult($input: SaveMatchResultInput!) {
                saveMatchResult(input: $input) {
                    id
                    playerId
                    winner
                    redTerritory
                    blueTerritory
                    duration
                    timestamp
                }
            }
        `;

        return ballSquareClient.mutate({
            mutation: MUTATION,
            variables: { input },
        });
    },
};

export const graphqlApi = {
    createGame: (formData, imageUrl) => {
        const MUTATION = gql`
            mutation CreateGame($input: GameCreateDtoInput!) {
                createGame(input: $input) {
                    id
                    name
                }
            }
        `;
        return client.mutate({
            mutation: MUTATION,
            variables: {
                input: {
                    name: formData.name,
                    genre: formData.genre,
                    price: parseInt(formData.price),
                    platform: formData.platform,
                    description: formData.description,
                    rating: parseFloat(formData.rating) || 0,
                    imageUrl: imageUrl
                }
            }
        });
    },
    updateGame: (id, formData, imageUrl) => {
        const MUTATION = gql`
            mutation Update($id: String!, $input: GameCreateDtoInput!) {
                updateGame(id: $id, input: $input) { id name }
            }
        `;
        return client.mutate({
            mutation: MUTATION,
            variables: {
                id,
                input: { ...formData, price: parseInt(formData.price), rating: parseFloat(formData.rating) || 0, imageUrl }
            }
        });
    },
    getAllGames: () => {
        const QUERY = gql`
            query GetGames {
                games {
                    id
                    name
                    genre
                    price
                    imageUrl
                    platform
                    description
                    rating
                }
            }
        `;
        return client.query({ query: QUERY, fetchPolicy: 'no-cache' });
    },
    deleteGame: (id) => {
        const MUTATION = gql`
            mutation Delete($id: String!) {
                deleteGame(id: $id)
            }
        `;
        return client.mutate({ mutation: MUTATION, variables: { id } });
    }
};

// BallSquare Territory Battle - Telemetry API
export const ballSquareTelemtryApi = {
    logTelemetry: (sessionId, eventType, data) => {
        const MUTATION = gql`
            mutation LogTelemetry($input: LogTelemetryInput!) {
                logTelemetry(input: $input) {
                    id
                    sessionId
                    eventType
                    rttMs
                    redPct
                    bluePct
                    bounceCount
                    note
                    timestamp
                }
            }
        `;
        return ballSquareClient.mutate({
            mutation: MUTATION,
            variables: {
                input: {
                    sessionId,
                    eventType,
                    rttMs: data.rttMs || 0,
                    redPct: data.redPct || 0,
                    bluePct: data.bluePct || 0,
                    bounceCount: data.bounceCount || 0,
                    note: data.note || '',
                }
            },
            errorPolicy: 'all',
        });
    }
};