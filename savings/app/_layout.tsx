import * as React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./HomeScreen";
import Login from "./Login";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { AppProvider } from "../context/AppContext";

// Import your screens

const Stack = createStackNavigator();

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <Stack.Navigator>
      {session && session.user ? (
        <Stack.Screen name="Home" options={{ headerShown: false }}>
          {(props) => (
            <AppProvider session={session}>
              <HomeScreen {...props} session={session} />
            </AppProvider>
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default App;
