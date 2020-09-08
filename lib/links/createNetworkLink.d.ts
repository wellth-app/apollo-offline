import { ApolloLink } from "apollo-link";
import { OfflineLinkOptions } from "../links/offline";
export interface CreateNetworkLinkOptions extends OfflineLinkOptions {
    disableOffline: boolean;
    offlineLink?: ApolloLink;
    onlineLink?: ApolloLink;
}
export declare const createNetworkLink: ({ offlineLink, onlineLink, disableOffline, ...offlineLinkOptions }: CreateNetworkLinkOptions) => ApolloLink;
export default createNetworkLink;
