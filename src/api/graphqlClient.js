import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

const client = new ApolloClient({
    link: new HttpLink({ uri: `${BASE_URL}/graphql` }),
    cache: new InMemoryCache(),
});

export const graphqlApi = {
    createBook: (formData, imageUrl) => {
        const MUTATION = gql`
            mutation CreateBook($input: BookCreateDtoInput!) {
                createBook(input: $input) {
                    id
                    title
                }
            }
        `;
        return client.mutate({
            mutation: MUTATION,
            variables: {
                input: {
                    title: formData.title,
                    author: formData.author,
                    price: parseInt(formData.price),
                    imageUrl: imageUrl
                }
            }
        });
    },
    updateBook: (id, formData, imageUrl) => {
        const MUTATION = gql`
            mutation Update($id: String!, $input: BookCreateDtoInput!) {
                updateBook(id: $id, input: $input) { id title }
            }
        `;
        return client.mutate({
            mutation: MUTATION,
            variables: { 
                id, 
                input: { ...formData, price: parseInt(formData.price), imageUrl } 
            }
        });
    },
    getAllBooks: () => {
        const QUERY = gql`
            query GetBooks {
                books {
                    id
                    title
                    author
                    price
                    imageUrl
                }
            }
        `;
        // Cần đảm bảo Backend có Query tên là 'books'
        return client.query({ query: QUERY, fetchPolicy: 'no-cache' });
    },
    deleteBook: (id) => {
        const MUTATION = gql`
            mutation Delete($id: String!) {
                deleteBook(id: $id)
            }
        `;
        return client.mutate({ mutation: MUTATION, variables: { id } });
    }
};