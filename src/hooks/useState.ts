import { reactive } from 'vue';
// import { merge } from 'lodash';
export default function useState<T extends Object>(props: T) {
  const data = reactive<T>(props);
  const setData = <K extends T>(params: Partial<K>) => {
    // Object.keys(params).map(item => {
    //   if (params[item] instanceof Array) {
    //     params[item] = reactive(params[item])
    //   }
    // })
    // data = merge(data, params);
    Object.keys(params).map((item) => {
      data[item] = params[item];
    });
  };
  return { state: data, setData };
}
