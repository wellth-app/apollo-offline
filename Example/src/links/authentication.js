// @flow
import { ApolloLink, Observable, Operation, NextLink } from "apollo-link";

export type Token = ?string;

export type Options = {
  getToken: () => Token,
  expired: string => void,
  format: string => void,
  reauthenticate: () => Promise<Token>,
};

export default class AuthenticationLink extends ApolloLink {
  constructor(options: Options) {
    super((operation: Operation, forward: NextLink) => {
      const { getToken, expired, reauthenticate, format } = options;
      const request = { ...operation };

      return new Observable(observer => {
        const token = getToken();
        const tokenExpired = token ? expired(token) : true;

        let subscriber;
        Promise.resolve(tokenExpired)
          .then(expired => (expired ? reauthenticate() : token))
          .then(token => {
            if (token) {
              request.setContext({
                headers: {
                  authorization: format(token),
                },
              });
            }

            return request;
          })
          .then(request => {
            subscriber = forward(request).subscribe({
              next: observer.next.bind(observer),
              error: observer.error.bind(observer),
              complete: observer.complete.bind(observer),
            });
          })
          .catch(observer.error.bind(observer));

        return () => {
          if (subscriber) subscriber.unsubscribe();
        };
      });
    });
  }
}
