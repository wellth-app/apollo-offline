import gql from "graphql-tag";

export default gql`
  query AllTodos {
    allTodos {
      title
      id
      completed
    }
  }
`;
