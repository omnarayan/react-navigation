import {
  CommonActions,
  createNavigatorFactory,
  type DefaultNavigatorOptions,
  type DefaultRouterOptions,
  type EventMapBase,
  type NavigationAction,
  type NavigationProp,
  type NavigationState,
  type NavigatorTypeBagBase,
  type ParamListBase,
  type RouterFactory,
  type StaticConfig,
  type StaticParamList,
  type TypedNavigator,
  useNavigationBuilder,
} from '@react-navigation/core';
import * as React from 'react';
import type {
  createStandardNavigator,
  NavigatorArgs as StandardNavigationArgs,
} from 'standard-navigation';

import { useBuildHref } from './useLinkBuilder';

type EventData<Event> = Event extends { data?: infer Data }
  ? Data extends object | undefined
    ? Data
    : object | undefined
  : undefined;

type EventCanPreventDefault<Event> = Event extends { canPreventDefault: true }
  ? true
  : false;

type StandardEventMap<EventMap extends EventMapBase> = {
  [EventName in keyof EventMap]: {
    data: EventData<EventMap[EventName]>;
    canPreventDefault: EventCanPreventDefault<EventMap[EventName]>;
  };
};

type ActionHelpersOf<T> =
  T extends Record<string, (...args: never[]) => unknown> ? T : {};

export type StandardNavigator<
  ScreenOptions extends {},
  EventMap extends EventMapBase,
  NavigatorProps extends object = {},
> = ReturnType<
  typeof createStandardNavigator<
    ScreenOptions,
    StandardEventMap<EventMap>,
    NavigatorProps
  >
>;

type StandardNavigationNavigatorProps<
  State extends NavigationState,
  NavigatorID extends string | undefined,
  RouterOptions extends DefaultRouterOptions,
  ScreenOptions extends {},
  EventMap extends EventMapBase,
  NavigatorProps extends object,
  Navigation,
> = DefaultNavigatorOptions<
  ParamListBase,
  NavigatorID,
  State,
  ScreenOptions,
  EventMap,
  Navigation
> &
  RouterOptions &
  Omit<
    NavigatorProps,
    keyof StandardNavigationArgs<ScreenOptions, StandardEventMap<EventMap>>
  >;

export interface StandardNavigationTypeBagBase extends NavigatorTypeBagBase {
  ActionHelpers: {};
  ScreenOptions: {};
  EventMap: EventMapBase;
  NavigatorProps: {};
  RouterOptions: DefaultRouterOptions;
  NavigationList: {
    [RouteName in keyof this['ParamList']]: NavigationProp<
      this['ParamList'],
      RouteName,
      this['NavigatorID'],
      this['State'],
      this['ScreenOptions'],
      this['EventMap']
    > &
      ActionHelpersOf<this['ActionHelpers']>;
  };
}

type StandardNavigationTypeBagFor<
  TypeBag extends StandardNavigationTypeBagBase,
  ParamList extends ParamListBase,
  NavigatorID extends string | undefined = string | undefined,
> = TypeBag & {
  ParamList: ParamList;
  NavigatorID: NavigatorID;
};

type StandardNavigationFor<TypeBag extends StandardNavigationTypeBagBase> =
  StandardNavigationTypeBagFor<
    TypeBag,
    ParamListBase
  >['NavigationList'][keyof StandardNavigationTypeBagFor<
    TypeBag,
    ParamListBase
  >['NavigationList']];

type StandardNavigationNavigatorComponent<
  TypeBag extends StandardNavigationTypeBagBase,
> = React.ComponentType<
  StandardNavigationNavigatorProps<
    StandardNavigationTypeBagFor<TypeBag, ParamListBase>['State'],
    string | undefined,
    TypeBag['RouterOptions'],
    TypeBag['ScreenOptions'],
    TypeBag['EventMap'],
    TypeBag['NavigatorProps'],
    StandardNavigationFor<TypeBag>
  >
>;

type StandardNavigationTypeBagWithNavigator<
  TypeBag extends StandardNavigationTypeBagBase,
  ParamList extends ParamListBase,
  NavigatorID extends string | undefined = string | undefined,
> = StandardNavigationTypeBagFor<TypeBag, ParamList, NavigatorID> & {
  Navigator: StandardNavigationNavigatorComponent<TypeBag>;
};

type StaticParamListForConfig<
  Config extends StaticConfig<NavigatorTypeBagBase>,
> = StaticParamList<{
  config: Config;
}> &
  ParamListBase;

type StandardNavigationCreateNavigator<
  TypeBag extends StandardNavigationTypeBagBase,
> = {
  <
    const ParamList extends ParamListBase,
    const NavigatorID extends string | undefined = string | undefined,
    const Bag extends
      NavigatorTypeBagBase = StandardNavigationTypeBagWithNavigator<
      TypeBag,
      ParamList,
      NavigatorID
    >,
  >(): TypedNavigator<Bag, undefined>;
  <
    const Config extends StaticConfig<
      StandardNavigationTypeBagWithNavigator<TypeBag, ParamListBase>
    >,
  >(
    config: Config
  ): TypedNavigator<
    StandardNavigationTypeBagWithNavigator<
      TypeBag,
      StaticParamListForConfig<Config>
    >,
    Config
  >;
};

export type StandardNavigationFactories<
  TypeBag extends StandardNavigationTypeBagBase,
> = {
  createNavigator: StandardNavigationCreateNavigator<TypeBag>;
  createScreen: <const Config>(config: Config) => Config;
};

export function createStandardNavigationFactories<
  TypeBag extends StandardNavigationTypeBagBase,
>(
  standardNavigator: StandardNavigator<
    TypeBag['ScreenOptions'],
    TypeBag['EventMap'],
    TypeBag['NavigatorProps']
  >,
  router: RouterFactory<
    StandardNavigationTypeBagFor<TypeBag, ParamListBase>['State'],
    NavigationAction,
    TypeBag['RouterOptions']
  >
): StandardNavigationFactories<TypeBag> {
  type Bag = StandardNavigationTypeBagFor<TypeBag, ParamListBase>;
  type State = Bag['State'];
  type RouterOptions = TypeBag['RouterOptions'];
  type ScreenOptions = TypeBag['ScreenOptions'];
  type EventMap = TypeBag['EventMap'];
  type NavigatorProps = TypeBag['NavigatorProps'];
  type ActionHelpers = ActionHelpersOf<Bag['ActionHelpers']>;
  type Navigation = StandardNavigationFor<TypeBag>;
  type StandardArgs = StandardNavigationArgs<
    ScreenOptions,
    StandardEventMap<EventMap>
  >;

  function StandardNavigationNavigator(
    props: StandardNavigationNavigatorProps<
      State,
      string | undefined,
      RouterOptions,
      ScreenOptions,
      EventMap,
      NavigatorProps,
      Navigation
    >
  ) {
    const {
      id,
      initialRouteName,
      UNSTABLE_routeNamesChangeBehavior,
      children,
      layout,
      screenListeners,
      screenOptions,
      screenLayout,
      UNSTABLE_router,
      ...rest
    } = props;

    // `rest` contains both router options and custom standard navigator props.
    // TypeScript can't split that intersection after destructuring, but
    // `useNavigationBuilder` needs the router options and ignores unrelated keys.
    const builderOptions: DefaultNavigatorOptions<
      ParamListBase,
      string | undefined,
      State,
      ScreenOptions,
      EventMap,
      Navigation
    > &
      RouterOptions = {
      id,
      initialRouteName,
      UNSTABLE_routeNamesChangeBehavior,
      children,
      layout,
      screenListeners,
      screenOptions,
      screenLayout,
      UNSTABLE_router,
      ...rest,
    };

    const { state, descriptors, navigation, NavigationContent } =
      useNavigationBuilder<
        State,
        RouterOptions,
        ActionHelpers,
        ScreenOptions,
        EventMap
      >(router, builderOptions);

    const buildHref = useBuildHref();

    const standardState = React.useMemo(
      (): StandardArgs['state'] => ({
        index: state.index,
        routes: state.routes.map((route: State['routes'][number]) => ({
          key: route.key,
          name: route.name,
          params: route.params,
          href: buildHref(route.name, route.params),
        })),
      }),
      [buildHref, state.index, state.routes]
    );

    const standardDescriptors = React.useMemo(() => {
      const result: StandardArgs['descriptors'] = {};

      for (const route of state.routes) {
        const descriptor = descriptors[route.key];

        result[route.key] = {
          options: descriptor.options,
          render: descriptor.render,
        };
      }

      return result;
    }, [descriptors, state.routes]);

    const actions = React.useMemo<StandardArgs['actions']>(
      () => ({
        navigate(name: string, params?: object | undefined) {
          navigation.dispatch({
            ...CommonActions.navigate(name, params),
            target: state.key,
          });
        },
      }),
      [navigation, state.key]
    );

    // React Navigation's emitter and standard-navigation's emitter accept the
    // same event shape, but their generic return types are modeled separately.
    const emit = navigation.emit as StandardArgs['emitter']['emit'];

    // `rest` may also include router options. TypeScript can't separate those
    // from custom navigator props after destructuring a generic intersection.
    const standardNavigatorProps = rest as unknown as Omit<
      NavigatorProps,
      keyof StandardArgs
    >;

    return (
      <NavigationContent>
        {standardNavigator.render({
          ...standardNavigatorProps,
          state: standardState,
          descriptors: standardDescriptors,
          actions,
          emitter: {
            emit,
          },
        })}
      </NavigationContent>
    );
  }

  function createNavigator<
    const ParamList extends ParamListBase,
    const NavigatorID extends string | undefined = string | undefined,
    const Bag extends
      NavigatorTypeBagBase = StandardNavigationTypeBagWithNavigator<
      TypeBag,
      ParamList,
      NavigatorID
    >,
  >(): TypedNavigator<Bag, undefined>;
  function createNavigator<
    const Config extends StaticConfig<
      StandardNavigationTypeBagWithNavigator<TypeBag, ParamListBase>
    >,
  >(
    config: Config
  ): TypedNavigator<
    StandardNavigationTypeBagWithNavigator<
      TypeBag,
      StaticParamListForConfig<Config>
    >,
    Config
  >;
  function createNavigator(config?: unknown) {
    return createNavigatorFactory(StandardNavigationNavigator)(config);
  }

  function createScreen<const Config>(config: Config) {
    return config;
  }

  const factories: StandardNavigationFactories<TypeBag> = {
    createNavigator,
    createScreen,
  };

  return factories;
}
