import { ApolloLink } from "apollo-link";
import OfflineLink, { OfflineLinkOptions } from "../links/offline";

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
}: CreateNetworkLinkOptions) =>
  ApolloLink.from(
    [
      offlineLink,
      disableOffline ? null : new OfflineLink(offlineLinkOptions),
      onlineLink,
    ].filter(Boolean),
  );

export default createNetworkLink;
