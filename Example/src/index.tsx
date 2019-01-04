import * as React from "react";
import { ApolloProvider } from "react-apollo";
import graphQLClient from "./consumers";
import App from "./containers/GraphQL";

export default () => {
  return (
    <ApolloProvider provider={graphQLClient}>
      <App />
    </ApolloProvider>
  );
};
