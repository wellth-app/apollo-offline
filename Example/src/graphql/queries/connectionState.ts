import gql from "graphql-tag";

export default gql`
  {
    networkConnected @client
    manualNetwork @client
  }
`;
