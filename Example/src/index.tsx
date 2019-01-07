import * as React from "react";
import { SafeAreaView } from "react-native";
import { ApolloProvider } from "react-apollo";
import graphQLClient from "./consumers";
import App from "./containers/GraphQL";

export default () => (
  <ApolloProvider client={graphQLClient}>
    <SafeAreaView>
      <App />
    </SafeAreaView>
  </ApolloProvider>
);
