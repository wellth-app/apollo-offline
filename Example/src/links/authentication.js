/// @flow
import { ApolloLink, Operation, NextLink } from "apollo-link";

export type Options = {};

export default class AuthenticationLink extends ApolloLink {
  constructor(options: Options) {
    super((operation: Operation, forward) => {});
  }
}
