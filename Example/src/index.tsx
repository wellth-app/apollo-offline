import * as React from "react";
import { SafeAreaView } from "react-native";
import { ApolloProvider } from "react-apollo";
import graphQLClient from "./consumers";
import Navigator from "./navigation";

export default () => (
  <ApolloProvider client={graphQLClient}>
    <SafeAreaView style={{ flex: 1 }}>
      <Navigator />
    </SafeAreaView>
  </ApolloProvider>
);
