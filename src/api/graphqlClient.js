import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

const client = new ApolloClient({
    link: new HttpLink({ uri: `${BASE_URL}/graphql` }),
    cache: new InMemoryCache(),
});

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