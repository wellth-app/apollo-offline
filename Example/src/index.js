import * as React from "react";
import { ApolloProvider } from "apollo-client";
import graphQLClient from "./consumers";
import QueryResults from "./components/QueryResults";

export default () => {
  return (
    <ApolloProvider provider={graphQLClient}>
      <QueryResults
        placeholder="Placeholder text"
        loadingMessage="Loading..."
        loading={true}
      />
    </ApolloProvider>
  );
};
