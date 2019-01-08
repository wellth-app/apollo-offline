import gql from "graphql-tag";

export default gql`
  mutation CreateTodo($title: String!, $completed: Boolean) {
    createTodo(title: $title, completed: $completed) {
      title
      id
      completed
    }
  }
`;
