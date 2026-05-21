import { Button, Text } from '@react-navigation/elements';
import {
  createPathConfigForStaticNavigation,
  createStandardNavigationFactories,
  type EventArg,
  type NavigationProp,
  type StackActionHelpers,
  type StackNavigationState,
  StackRouter,
  type StackRouterOptions,
  type StandardNavigationTypeBagBase,
  type StaticParamList,
  type StaticScreenProps,
  useNavigation,
} from '@react-navigation/native';
import { expectTypeOf } from 'expect-type';
import type * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { createStandardNavigator } from 'standard-navigation';

type StandardStackOptions = {
  title?: string;
  subtitle?: string;
};

type StandardStackEventMap = {
  standardAction: {
    data: { routeKey: string };
    canPreventDefault: true;
  };
};

type StandardStackNavigatorProps = {
  label?: string;
  showEventButton?: boolean;
};

const StandardStackNavigator = createStandardNavigator<
  StandardStackOptions,
  StandardStackEventMap,
  StandardStackNavigatorProps
>(({ state, descriptors, actions, emitter, label, showEventButton }) => {
  const route = state.routes[state.index];
  const descriptor = descriptors[route.key];

  return (
    <View style={styles.navigator}>
      <View style={styles.navigatorHeader}>
        <View>
          <Text style={styles.navigatorLabel}>
            {label ?? 'Standard Navigation'}
          </Text>
          {descriptor.options.subtitle ? (
            <Text>{descriptor.options.subtitle}</Text>
          ) : null}
        </View>
        {showEventButton ? (
          <Button
            variant="plain"
            onPress={() => {
              const event = emitter.emit({
                type: 'standardAction',
                target: route.key,
                canPreventDefault: true,
                data: { routeKey: route.key },
              });

              if (!event.defaultPrevented) {
                actions.navigate(route.name, route.params);
              }
            }}
          >
            Emit event
          </Button>
        ) : null}
      </View>
      {descriptor.render()}
    </View>
  );
});

export interface StandardStackTypeBag extends StandardNavigationTypeBagBase {
  State: StackNavigationState<this['ParamList']>;
  ActionHelpers: StackActionHelpers<this['ParamList']>;
  ScreenOptions: StandardStackOptions;
  EventMap: StandardStackEventMap;
  NavigatorProps: StandardStackNavigatorProps;
  RouterOptions: StackRouterOptions;
}

const {
  createNavigator: createStandardStackNavigator,
  createScreen: createStandardStackScreen,
} = createStandardNavigationFactories<StandardStackTypeBag>(
  StandardStackNavigator,
  StackRouter
);

type NavigationObject = NavigationProp<StaticParamList<typeof StandardStack>>;

function HomeScreen() {
  const navigation = useNavigation<NavigationObject>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Button
        variant="filled"
        onPress={() =>
          navigation.navigate('StandardProfile', { user: 'Satya' })
        }
      >
        Open profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }: StaticScreenProps<{ user: string }>) {
  const navigation = useNavigation<NavigationObject>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.user}</Text>
      <View style={styles.buttons}>
        <Button
          variant="filled"
          onPress={() =>
            navigation.navigate('StandardDetails', {
              section: 'standard-navigation',
            })
          }
        >
          Open details
        </Button>
        <Button variant="tinted" onPress={() => navigation.goBack()}>
          Go back
        </Button>
      </View>
    </View>
  );
}

function DetailsScreen({ route }: StaticScreenProps<{ section: string }>) {
  const navigation = useNavigation<NavigationObject>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.section}</Text>
      <Button variant="tinted" onPress={() => navigation.goBack()}>
        Go back
      </Button>
    </View>
  );
}

const StandardStack = createStandardStackNavigator({
  label: 'Standard Navigation',
  showEventButton: true,
  screenListeners: {
    standardAction: (
      event: EventArg<'standardAction', true, { routeKey: string }>
    ) => {
      event.preventDefault();
      void event.data.routeKey;
    },
  },
  screens: {
    StandardHome: createStandardStackScreen({
      screen: HomeScreen,
      options: { title: 'Home', subtitle: 'Focused screen renderer' },
      linking: '',
    }),
    StandardProfile: createStandardStackScreen({
      screen: ProfileScreen,
      options: { title: 'Profile', subtitle: 'Typed params' },
      linking: 'profile/:user',
    }),
    StandardDetails: createStandardStackScreen({
      screen: DetailsScreen,
      options: { title: 'Details', subtitle: 'Custom event map' },
      linking: 'details/:section',
    }),
  },
});

const Navigation = StandardStack.getComponent();

{
  type StandardStackParamList = {
    StandardHome: undefined;
    StandardProfile: { user: string };
    StandardDetails: { section: string };
  };

  type StandardStackNavigation<
    RouteName extends
      keyof StandardStackParamList = keyof StandardStackParamList,
  > = NavigationProp<
    StandardStackParamList,
    RouteName,
    string | undefined,
    StackNavigationState<StandardStackParamList>,
    StandardStackOptions,
    StandardStackEventMap
  > &
    StackActionHelpers<StandardStackParamList>;

  type StandardStackNavigationList = {
    [RouteName in keyof StandardStackParamList]: StandardStackNavigation<RouteName>;
  };

  type StandardStackNavigatorArgs = Parameters<
    typeof StandardStackNavigator.render
  >[0];

  expectTypeOf<StandardStackNavigatorArgs>().toMatchObjectType<StandardStackNavigatorProps>();

  const checkStandardNavigatorArgs = (props: StandardStackNavigatorArgs) => {
    expectTypeOf(
      props.descriptors[props.state.routes[0].key].options
    ).toEqualTypeOf<StandardStackOptions>();

    expectTypeOf(props.label).toEqualTypeOf<string | undefined>();
    expectTypeOf(props.showEventButton).toEqualTypeOf<boolean | undefined>();

    props.emitter.emit({
      type: 'standardAction',
      target: props.state.routes[0].key,
      canPreventDefault: true,
      data: { routeKey: props.state.routes[0].key },
    });
  };

  type InferredStandardStackParamList = StaticParamList<typeof StandardStack>;

  expectTypeOf<InferredStandardStackParamList>().toEqualTypeOf<StandardStackParamList>();

  type StandardHomeNavigation = StandardStackNavigationList['StandardHome'];
  type StandardProfileNavigation =
    StandardStackNavigationList['StandardProfile'];

  expectTypeOf<keyof StandardStackNavigationList>().toEqualTypeOf<
    keyof StandardStackParamList
  >();

  expectTypeOf(
    StandardStack.config.label
  ).toEqualTypeOf<'Standard Navigation'>();

  expectTypeOf(StandardStack.config.showEventButton).toEqualTypeOf<true>();

  expectTypeOf<StandardHomeNavigation['getState']>().returns.toEqualTypeOf<
    StackNavigationState<StandardStackParamList>
  >();

  expectTypeOf<StandardHomeNavigation['setOptions']>()
    .parameter(0)
    .toEqualTypeOf<Partial<StandardStackOptions>>();

  expectTypeOf<StandardProfileNavigation['setParams']>()
    .parameter(0)
    .toEqualTypeOf<Partial<{ user: string }>>();

  expectTypeOf<StandardHomeNavigation['replace']>()
    .parameter(0)
    .toEqualTypeOf<keyof StandardStackParamList>();

  expectTypeOf<StandardHomeNavigation['replace']>().toMatchTypeOf<
    StackActionHelpers<StandardStackParamList>['replace']
  >();

  const checkStandardHomeNavigation = (navigation: StandardHomeNavigation) => {
    navigation.replace('StandardProfile', { user: 'Satya' });
    navigation.setOptions({ title: 'Home', subtitle: 'Focused screen' });

    navigation.addListener('standardAction', (event) => {
      expectTypeOf(event).toEqualTypeOf<
        EventArg<'standardAction', true, { routeKey: string }>
      >();
    });
  };

  const DynamicStandardStack =
    createStandardStackNavigator<StandardStackParamList>();

  type DynamicStandardStackNavigatorProps = React.ComponentProps<
    typeof DynamicStandardStack.Navigator
  >;

  expectTypeOf<
    DynamicStandardStackNavigatorProps['initialRouteName']
  >().toEqualTypeOf<keyof StandardStackParamList | undefined>();

  expectTypeOf(DynamicStandardStack.Screen).parameter(0).toExtend<{
    name?: keyof StandardStackParamList;
  }>();

  const dynamicScreenListeners: DynamicStandardStackNavigatorProps['screenListeners'] =
    {
      standardAction: (event) => {
        expectTypeOf(event).toEqualTypeOf<
          EventArg<'standardAction', true, { routeKey: string }>
        >();
      },
    };

  const dynamicScreen = (
    <DynamicStandardStack.Screen
      name="StandardProfile"
      component={ProfileScreen}
      options={({ navigation, route }) => {
        expectTypeOf(route.params).toEqualTypeOf<Readonly<{ user: string }>>();

        expectTypeOf(navigation.setOptions)
          .parameter(0)
          .toEqualTypeOf<Partial<StandardStackOptions>>();

        return { title: route.params.user, subtitle: 'Dynamic screen' };
      }}
      listeners={{
        standardAction: (event) => {
          expectTypeOf(event).toEqualTypeOf<
            EventArg<'standardAction', true, { routeKey: string }>
          >();
        },
      }}
    />
  );

  const dynamicNavigator = (
    <DynamicStandardStack.Navigator
      initialRouteName="StandardHome"
      label="Dynamic Standard Navigation"
      showEventButton
      screenListeners={dynamicScreenListeners}
    >
      {dynamicScreen}
    </DynamicStandardStack.Navigator>
  );

  void checkStandardNavigatorArgs;
  void checkStandardHomeNavigation;
  void dynamicNavigator;
}

export function StandardNavigation() {
  return <Navigation />;
}

StandardNavigation.title = 'Libraries - Standard Navigation';
StandardNavigation.linking = createPathConfigForStaticNavigation(
  StandardStack,
  {}
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  buttons: {
    gap: 12,
  },
  navigator: {
    flex: 1,
  },
  navigatorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  navigatorLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
