import { ApolloLink } from "apollo-link";
import { setContext } from "apollo-link-context";

export type Token = string | undefined | null;

export interface Options {
  getToken: () => Token;
  expired: (token: string) => boolean;
  format: (token: string) => string;
  reauthenticate: () => Promise<Token>;
}

export default ({
  getToken,
  expired,
  reauthenticate,
  format,
}: Options): ApolloLink =>
  setContext(async (request: any, previousContext: any) => {
    if (!previousContext.requireAuth) {
      return previousContext;
    }

    const token = getToken();
    const tokenExpired = token ? expired(token) : true;
    const nextToken = tokenExpired ? await reauthenticate() : token;

    return !!nextToken
      ? {
          headers: {
            ...previousContext.headers,
            authorization: format(nextToken),
          },
        }
      : null;
  });
