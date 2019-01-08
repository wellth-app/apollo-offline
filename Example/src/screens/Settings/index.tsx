import React from "react";
import { Switch, Text, View } from "react-native";

interface Props {
  manualNetwork: boolean;
  onManualNetworkChange: (value: boolean) => void;
  networkConnected: boolean;
  onNetworkConnectedChange: (value: boolean) => void;
}

export default ({
  manualNetwork,
  onManualNetworkChange,
  networkConnected,
  onNetworkConnectedChange,
}: Props) => (
  <View>
    <Text>
      These settings are for controlling the online and offline state for the
      network client.
    </Text>

    <Text>
      If manual network is checked, the state of "network connected" is used to
      indicate to `apollo-offline` whether the network is connected or not.
    </Text>

    <View>
      <Text>Manual network</Text>
      <Switch value={manualNetwork} onValueChange={onManualNetworkChange} />
    </View>

    {manualNetwork ? (
      <View>
        <Text>Network connected</Text>
        <Switch
          value={networkConnected}
          onValueChange={onNetworkConnectedChange}
        />
      </View>
    ) : null}
  </View>
);
