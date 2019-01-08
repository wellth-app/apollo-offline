import * as React from "react";
import { Mutation } from "react-apollo";
import Screen from "../../screens/CreateTodo";
import createTodoMutation from "../../graphql/mutations/createTodo";
import allTodosQuery from "../../graphql/queries/allTodos";

export default () => (
  <Mutation
    mutation={createTodoMutation}
    update={(dataProxy, result) => {
      const data: any = dataProxy.readQuery({ query: allTodosQuery }, true);
      data.allTodos.push(result.data.createTodo);
      dataProxy.writeData({ data });
    }}
  >
    {(createTodo) => (
      <Screen
        style={{ flex: 1 }}
        submit={async (title) => {
          createTodo({ variables: { title, completed: false } });
        }}
      />
    )}
  </Mutation>
);
