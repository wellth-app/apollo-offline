import * as React from "react";
import { FlatList, View, ViewStyle, StyleProp } from "react-native";
import Loading from "../../components/Loading";
import Row from "./components/Row";
import styles from "./styles";

type Todo = {
  title: string;
  completed: boolean;
};

export interface Props {
  style?: StyleProp<ViewStyle>;
  todos: Todo[];
  loading: boolean;
  onTodoSelected: (index: number) => Promise<void>;
}

export default ({ style, todos = [], loading, onTodoSelected }: Props) => (
  <View style={[styles.container, style]}>
    {loading ? (
      <Loading />
    ) : (
      <FlatList
        style={styles.list}
        data={todos}
        renderItem={({ item, index }) => (
          <Row
            key={index}
            style={styles.row}
            {...item}
            onPress={() => onTodoSelected(index)}
          />
        )}
      />
    )}
  </View>
);
