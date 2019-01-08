import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleProp,
  ViewStyle,
} from "react-native";

export interface Props {
  style?: StyleProp<ViewStyle>;
  title: string;
  completed: boolean;
  onPress: () => Promise<void>;
}

export default ({ style, title, onPress }: Props) => (
  <TouchableOpacity onPress={onPress}>
    <View style={style}>
      <Text>{title}</Text>
    </View>
  </TouchableOpacity>
);
