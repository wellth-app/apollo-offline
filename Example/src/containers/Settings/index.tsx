import React from "react";
import Screen from "../../screens/Settings";
import { Query } from "react-apollo";
import connectionStateQuery from "../../graphql/queries/connectionState";

export default () => (
  <Query query={connectionStateQuery}>
    {({ data, client }) => (
      <Screen
        manualNetwork={data.manualNetwork}
        onManualNetworkChange={async (manualNetwork) =>
          client.writeData({ data: { manualNetwork } })
        }
        networkConnected={data.networkConnected}
        onNetworkConnectedChange={async (networkConnected) =>
          client.writeData({ data: { networkConnected } })
        }
      />
    )}
  </Query>
);
