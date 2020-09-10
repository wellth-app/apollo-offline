import { ApolloLink } from "apollo-link";
import OfflineLink, { OfflineLinkOptions } from "./offline";

export interface CreateNetworkLinkOptions extends OfflineLinkOptions {
  disableOffline: boolean;
  offlineLink?: ApolloLink;
  onlineLink?: ApolloLink;
}

export const createNetworkLink = ({
  offlineLink,
  onlineLink,
  disableOffline,
  ...offlineLinkOptions
}: CreateNetworkLinkOptions): ApolloLink =>
  ApolloLink.from(
    [
      offlineLink,
      disableOffline ? null : new OfflineLink(offlineLinkOptions),
      onlineLink,
    ].filter(Boolean),
  );

export default createNetworkLink;
