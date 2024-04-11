import Base from "tmw-kit/dist/ctrl/base.js";
import CollectionHelper from "../collectionHelper.js";
import { ResultData } from "tms-koa";
import Collection from "./collection.js";
import axios from 'axios'
import log4js from 'log4js'
const logger = log4js.getLogger('tms-mongodb-web')

const ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

class dealExcel extends Base {
  cl
  clHelper
  authorization
  collection

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.clHelper = new CollectionHelper(this)
    this.collection = new Collection(ctx, client, dbContext, mongoClient, pushContext, fsContext)

    this.cl = this.mongoClient.db(ADMIN_DB)
  }

  async dealWihtExcel() {
    this.authorization = this.request.header.authorization
    const { sheng_ming_cheng, shi_jian_chuo } = this.request.query; // 从查询参数中获取条件  
    const query = {
      sheng_ming_cheng,
      shi_jian_chuo
    };
    logger.info("入参为", query)
    let tablesArray = this.request.body.tables;

    let collections = []
    if (tablesArray && tablesArray.length > 0) {
      collections = tablesArray
    } else {
      collections = await this.cl.listCollections().toArray();
    }
    logger.info("collections:", JSON.stringify(collections))
    const results = [];

    for (const collection of collections) {
      const collName = collection.name;
      const collectionRef = await this.cl.collection(collName);

      const foundDoc = await collectionRef.findOne(query);


      if (foundDoc) {
        results.push({ collectionName: collName, ...foundDoc });
      }

    }

    logger.info("result", JSON.stringify(results))

    const jsonResult = await this.combineFields(results);
    logger.info("jsonResult", jsonResult);
    return new ResultData(jsonResult);



  }
  async combineFields(array): Promise<{}> {
    const fieldObjectList = [];


    let transformed = {}
    for (const item of array) {
      const collectionName = item.collectionName;
      if (collectionName) {
        try {
          const properties = await this.fetchPropertiesByCollectionName(collectionName);
          fieldObjectList.push(properties)
        } catch (error) {
          // 处理错误，例如跳过当前项或记录错误  
          console.error(`Error processing collection ${collectionName}:`, error);
        }
      }

    }
    const fieldJson = fieldObjectList.reduce((accumulator, currentObject) => {
      return { ...accumulator, ...currentObject };
    }, {});
    logger.info("fieldJson", JSON.stringify(fieldJson))

    const combinedJson = {};

    array.forEach(jsonObject => {
      for (let key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
          if (!combinedJson.hasOwnProperty(key)) {
            combinedJson[key] = jsonObject[key];
          }
        }
      }
    });
    logger.info("combinedJson", JSON.stringify(combinedJson))

    logger.info("transformData begin")



    transformed = await this.transformData(combinedJson, fieldJson)


    return transformed;
  }
  async fetchPropertiesByCollectionName(collectionName) {

    try {
      const headers = {
        'Authorization': this.authorization
      };
      // const response = this.collection.byName(ADMIN_DB, collectionName)
      // logger.info("response", JSON.stringify(response))
      // 调用方式需要后续修改
      const response = await axios.get(`http://localhost:3030/api/admin/collection/byName?db=${ADMIN_DB}&cl=${collectionName}`, { headers });
      const properties = response.data.result.schema.body.properties;
      return properties;
    } catch (error) {
      console.error(`Error fetching properties for collection ${collectionName}:`, error);
      throw error; // 或者你可以选择返回一个空对象或进行其他错误处理  
    }
  }



  async transformData(result, properties): Promise<{}> {


    // 初始化返回的对象  
    let transformedData = {};
    transformedData["省份"] = result.sheng_ming_cheng;
    transformedData["时间戳"] = parseFloat(result.shi_jian_chuo);
    transformedData["数据"] = {};


    const dataDes = [];
    for (const key in result) {
      if (result.hasOwnProperty(key) && properties.hasOwnProperty(key)) {
        const description = properties[key];
        const value = result[key];
        dataDes.push({
          [key]: {
            name: description.title,
            value: value
          }
        });
      }
    }
    transformedData["数据"] = dataDes;


    logger.info("transformedData,", JSON.stringify(transformedData))

    return transformedData;
  }
}


export default dealExcel

