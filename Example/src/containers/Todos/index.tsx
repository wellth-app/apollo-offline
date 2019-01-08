import * as React from "react";
import { Query } from "react-apollo";
import Screen from "../../screens/TodoList";
import allTodosQuery from "../../graphql/queries/allTodos";

export default () => (
  <Query query={allTodosQuery}>
    {({ loading, data: { allTodos } }) => (
      <Screen
        style={{ flex: 1 }}
        loading={loading}
        todos={allTodos}
        onTodoSelected={async (index) =>
          console.log("Selected", allTodos[index])
        }
      />
    )}
  </Query>
);
