import React from "react";
import { Button, View, TextInput, StyleProp, ViewStyle } from "react-native";
import styles from "./styles";

interface Props {
  style?: StyleProp<ViewStyle>;
  body?: string;
  submit: (body: string) => Promise<void>;
}

interface State {
  body: string;
}

export default class CreateTodo extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      body: props.body || "",
    };
  }

  render() {
    const { style, submit } = this.props;
    const { body } = this.state;

    return (
      <View style={[styles.container, style]}>
        <TextInput
          style={styles.titleInput}
          placeholder="What do you want to do?"
          value={body}
          onChangeText={(text) => this.setState({ body: text })}
        />
        <Button
          title="Submit"
          onPress={async () => {
            await submit(body);
            this.setState({ body: "" });
          }}
        />
      </View>
    );
  }
}
