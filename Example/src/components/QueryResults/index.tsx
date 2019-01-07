import * as React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export interface Props {
  loading: boolean;
  loadingMessage: string;
  placeholder: string;
  data: any;
}

export default ({ loading, loadingMessage, placeholder, data }: Props) => (
  <ScrollView>
    {loading ? (
      <View>
        <ActivityIndicator />
        <Text>{loadingMessage}</Text>
      </View>
    ) : (
      <Text>{data ? JSON.stringify(data) : placeholder}</Text>
    )}
  </ScrollView>
);
