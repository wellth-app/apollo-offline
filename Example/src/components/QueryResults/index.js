// @flow
import * as React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export type Props = {
  loading: boolean,
  loadingMessage: string,
  placeholder: string,
  queryResult: ?string,
};

export default class QueryResults extends React.PureComponent<Props> {
  renderResultView() {
    const { queryResult, placeholder } = this.props;
    const message = queryResult ? queryResult : placeholder;
    return <Text>{message}</Text>;
  }

  renderLoadingView() {
    const { loadingMessage } = this.props;
    return (
      <View>
        <ActivityIndicator />
        <Text>{loadingMessage}</Text>
      </View>
    );
  }

  render() {
    const { loading } = this.props;
    return (
      <ScrollView>
        {loading ? this.renderLoadingView() : this.renderResultView()}
      </ScrollView>
    );
  }
}
