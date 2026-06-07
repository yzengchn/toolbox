<template>
  <div class="tool-container">
    <ToolHeader
      title="JT808/JT809 解析"
      description="JT808 与 JT809 报文解析、基础组包、Hex 转换和常用字段换算"
    />

    <div class="tool-content">
      <PageTabs>
        <n-tab-pane name="parse" tab="JT808 解析">
          <div class="workspace-grid">
            <n-card class="panel-card" title="报文输入">
              <n-space vertical :size="14">
                <div class="actions-row">
                  <n-button type="primary" @click="handleParse">分析</n-button>
                  <n-button @click="loadParseDemo">示例</n-button>
                  <n-button @click="clearParse">清空</n-button>
                </div>
                <n-input
                  v-model:value="parseInput"
                  type="textarea"
                  placeholder="输入 JT808 Hex 报文；多包可按行分隔"
                  :rows="18"
                  clearable
                />
              </n-space>
            </n-card>

            <div class="result-stack">
              <n-alert v-if="parseError" type="error">{{ parseError }}</n-alert>
              <n-empty v-if="!parseResults.length && !parseError" description="解析结果将在这里展示" />

              <div v-if="parseResults.length" class="parse-summary">
                <div
                  v-for="item in jt808Summary"
                  :key="item.label"
                  class="summary-tile"
                  :class="item.status ? `summary-tile--${item.status}` : undefined"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>

              <n-card
                v-for="item in parseResults"
                :key="item.order"
                class="result-card"
                :title="`第 ${item.order} 包`"
              >
                <template #header-extra>
                  <n-tag :type="item.checksum.matched ? 'success' : 'error'" size="small">
                    BCC {{ item.checksum.matched ? '通过' : '异常' }}
                  </n-tag>
                </template>

                <n-alert v-if="item.error" type="error" class="section-gap">
                  {{ item.error }}
                </n-alert>

                <n-descriptions v-if="item.header" bordered size="small" :column="2" label-placement="left">
                  <n-descriptions-item label="消息 ID">
                    0x{{ item.header.msgId }} {{ item.header.msgName }}
                  </n-descriptions-item>
                  <n-descriptions-item label="终端手机号">
                    {{ item.header.terminalPhoneNo }}
                  </n-descriptions-item>
                  <n-descriptions-item label="流水号">
                    {{ item.header.msgSerialNo }}
                  </n-descriptions-item>
                  <n-descriptions-item label="消息体长度">
                    {{ item.header.bodyLength }} 字节
                  </n-descriptions-item>
                  <n-descriptions-item label="协议版本">
                    {{ item.header.versionFlag ? `2019 / v${item.header.protocolVersion}` : '2013' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="分包">
                    {{ item.header.isSubpackage ? `${item.header.packageIndex}/${item.header.packageTotal}` : '否' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="校验码">
                    接收 {{ item.checksum.received }} / 计算 {{ item.checksum.calculated }}
                  </n-descriptions-item>
                  <n-descriptions-item label="边界符">
                    {{ item.validBoundary ? '包含 7E 边界' : '未包含边界，按裸数据解析' }}
                  </n-descriptions-item>
                </n-descriptions>

                <div v-if="item.bodyFields.length" class="field-list">
                  <div v-for="field in item.bodyFields" :key="field.label" class="field-row">
                    <span class="field-label">{{ field.label }}</span>
                    <span class="field-value">{{ field.value }}</span>
                    <span v-if="field.remark" class="field-remark">{{ field.remark }}</span>
                  </div>
                </div>

                <n-collapse class="section-gap">
                  <n-collapse-item title="原始/反转义 Hex" name="hex">
                    <n-code :code="`Raw: ${item.rawHex}\nUnescaped: ${item.unescapedHex}\nBody: ${item.bodyHex || '空'}`" language="text" word-wrap />
                  </n-collapse-item>
                </n-collapse>
              </n-card>
            </div>
          </div>
        </n-tab-pane>

        <n-tab-pane name="packet" tab="JT808 组包">
          <div class="workspace-grid workspace-grid--compact">
            <n-card class="panel-card" title="组包参数">
              <n-space vertical :size="14">
                <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                  <n-grid-item>
                    <n-form-item label="消息 ID">
                      <n-input v-model:value="packetForm.msgIdHex" placeholder="0200" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="协议版本">
                      <n-select v-model:value="packetForm.version" :options="versionOptions" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="终端手机号">
                      <n-input v-model:value="packetForm.phone" placeholder="123456789012" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="流水号">
                      <n-input-number v-model:value="packetForm.msgSerialNo" :min="0" :max="65535" style="width: 100%" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item v-if="packetForm.version === '2019'">
                    <n-form-item label="协议版本号">
                      <n-input-number v-model:value="packetForm.protocolVersion" :min="0" :max="255" style="width: 100%" />
                    </n-form-item>
                  </n-grid-item>
                </n-grid>

                <n-form-item label="消息体 Hex">
                  <n-input v-model:value="packetForm.bodyHex" type="textarea" :rows="8" placeholder="不含头、校验码和 7E" />
                </n-form-item>

                <div class="actions-row">
                  <n-button type="primary" @click="handleBuildPacket">生成报文</n-button>
                  <n-button @click="loadPacketDemo">示例</n-button>
                  <n-button @click="copyPacket" :disabled="!packetOutput">复制</n-button>
                </div>
              </n-space>
            </n-card>

            <n-card class="panel-card" title="组包结果">
              <n-alert v-if="packetError" type="error" class="section-gap">{{ packetError }}</n-alert>
              <n-input v-model:value="packetOutput" type="textarea" :rows="18" readonly placeholder="生成后的完整 7E 报文" />
            </n-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="jt809-parse" tab="JT809 解析">
          <div class="workspace-grid">
            <n-card class="panel-card" title="报文输入">
              <n-space vertical :size="14">
                <div class="actions-row">
                  <n-button type="primary" @click="handleJt809Parse">分析</n-button>
                  <n-button @click="loadJt809ParseDemo">示例</n-button>
                  <n-button @click="clearJt809Parse">清空</n-button>
                </div>
                <n-input
                  v-model:value="jt809ParseInput"
                  type="textarea"
                  placeholder="输入 JT809 Hex 报文；多包可按行分隔"
                  :rows="18"
                  clearable
                />
              </n-space>
            </n-card>

            <div class="result-stack">
              <n-alert v-if="jt809ParseError" type="error">{{ jt809ParseError }}</n-alert>
              <n-empty v-if="!jt809ParseResults.length && !jt809ParseError" description="解析结果将在这里展示" />

              <div v-if="jt809ParseResults.length" class="parse-summary">
                <div
                  v-for="item in jt809Summary"
                  :key="item.label"
                  class="summary-tile"
                  :class="item.status ? `summary-tile--${item.status}` : undefined"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>

              <n-card
                v-for="item in jt809ParseResults"
                :key="item.order"
                class="result-card"
                :title="`第 ${item.order} 包`"
              >
                <template #header-extra>
                  <n-tag :type="item.checksum.matched ? 'success' : 'error'" size="small">
                    CRC16 {{ item.checksum.matched ? '通过' : '异常' }}
                  </n-tag>
                </template>

                <n-alert v-if="item.error" type="error" class="section-gap">
                  {{ item.error }}
                </n-alert>

                <n-descriptions v-if="item.header" bordered size="small" :column="2" label-placement="left">
                  <n-descriptions-item label="消息 ID">
                    0x{{ item.header.msgId }} {{ item.header.msgName }}
                  </n-descriptions-item>
                  <n-descriptions-item label="报文序列号">
                    {{ item.header.msgSerialNo }}
                  </n-descriptions-item>
                  <n-descriptions-item label="数据体长度">
                    {{ item.header.bodyLength }} 字节
                  </n-descriptions-item>
                  <n-descriptions-item label="接入码">
                    {{ item.header.msgGnssCenterId }}
                  </n-descriptions-item>
                  <n-descriptions-item label="协议版本">
                    {{ item.header.versionFlag }}
                  </n-descriptions-item>
                  <n-descriptions-item label="加密标识">
                    {{ item.header.encryptFlag ? '已加密' : '未加密' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="加密密钥">
                    {{ item.header.encryptKey }}
                  </n-descriptions-item>
                  <n-descriptions-item label="校验码">
                    接收 {{ item.checksum.received }} / 计算 {{ item.checksum.calculated }}
                  </n-descriptions-item>
                  <n-descriptions-item label="边界符">
                    {{ item.validBoundary ? '包含 5B/5D 边界' : '未包含边界，按裸数据解析' }}
                  </n-descriptions-item>
                </n-descriptions>

                <div v-if="item.bodyFields.length" class="field-list">
                  <div v-for="field in item.bodyFields" :key="field.label" class="field-row">
                    <span class="field-label">{{ field.label }}</span>
                    <span class="field-value">{{ field.value }}</span>
                    <span v-if="field.remark" class="field-remark">{{ field.remark }}</span>
                  </div>
                </div>

                <n-collapse class="section-gap">
                  <n-collapse-item title="原始/反转义 Hex" name="hex">
                    <n-code :code="`Raw: ${item.rawHex}\nUnescaped: ${item.unescapedHex}\nBody: ${item.bodyHex || '空'}`" language="text" word-wrap />
                  </n-collapse-item>
                </n-collapse>
              </n-card>
            </div>
          </div>
        </n-tab-pane>

        <n-tab-pane name="jt809-packet" tab="JT809 组包">
          <div class="workspace-grid workspace-grid--compact">
            <n-card class="panel-card" title="组包参数">
              <n-space vertical :size="14">
                <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen">
                  <n-grid-item>
                    <n-form-item label="消息 ID">
                      <n-input v-model:value="jt809PacketForm.msgIdHex" placeholder="1001" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="报文序列号">
                      <n-input-number v-model:value="jt809PacketForm.msgSerialNo" :min="0" style="width: 100%" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="接入码">
                      <n-input-number v-model:value="jt809PacketForm.msgGnssCenterId" :min="0" style="width: 100%" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="协议版本">
                      <n-input-number v-model:value="jt809PacketForm.versionFlag" :min="0" :max="3" style="width: 100%" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="加密标识">
                      <n-select v-model:value="jt809PacketForm.encryptFlag" :options="encryptOptions" />
                    </n-form-item>
                  </n-grid-item>
                  <n-grid-item>
                    <n-form-item label="加密密钥">
                      <n-input-number v-model:value="jt809PacketForm.encryptKey" :min="0" style="width: 100%" />
                    </n-form-item>
                  </n-grid-item>
                </n-grid>

                <n-form-item label="消息体 Hex">
                  <n-input v-model:value="jt809PacketForm.bodyHex" type="textarea" :rows="8" placeholder="不含头、校验码和 5B/5D" />
                </n-form-item>

                <div class="actions-row">
                  <n-button type="primary" @click="handleBuildJt809Packet">生成报文</n-button>
                  <n-button @click="loadJt809PacketDemo">示例</n-button>
                  <n-button @click="copyJt809Packet" :disabled="!jt809PacketOutput">复制</n-button>
                </div>
              </n-space>
            </n-card>

            <n-card class="panel-card" title="组包结果">
              <n-alert v-if="jt809PacketError" type="error" class="section-gap">{{ jt809PacketError }}</n-alert>
              <n-input v-model:value="jt809PacketOutput" type="textarea" :rows="18" readonly placeholder="生成后的完整 5B/5D 报文" />
            </n-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="hex" tab="Hex 转换">
          <div class="workspace-grid workspace-grid--compact">
            <n-card class="panel-card" title="Hex / 文本">
              <n-space vertical :size="14">
                <n-select v-model:value="hexEncoding" :options="encodingOptions" />
                <n-input v-model:value="hexInput" type="textarea" :rows="10" placeholder="输入 Hex 或文本" />
                <div class="actions-row">
                  <n-button type="primary" @click="convertHexToText">Hex 转文本</n-button>
                  <n-button @click="convertTextToHex">文本转 Hex</n-button>
                  <n-button @click="copyHexOutput" :disabled="!hexOutput">复制</n-button>
                </div>
              </n-space>
            </n-card>

            <n-card class="panel-card" title="转换结果">
              <n-alert v-if="hexError" type="error" class="section-gap">{{ hexError }}</n-alert>
              <n-input v-model:value="hexOutput" type="textarea" :rows="14" readonly />
            </n-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="fields" tab="字段换算">
          <n-card class="panel-card field-tools" title="常用字段">
            <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
              <n-grid-item>
                <div class="mini-tool">
                  <h3>BCD</h3>
                  <n-input v-model:value="bcdInput" placeholder="手机号或 BCD Hex" />
                  <div class="actions-row">
                    <n-button @click="handleTextToBcd">文本转 BCD</n-button>
                    <n-button @click="handleBcdToText">BCD 转文本</n-button>
                  </div>
                  <n-input v-model:value="bcdOutput" readonly placeholder="结果" />
                </div>
              </n-grid-item>

              <n-grid-item>
                <div class="mini-tool">
                  <h3>经纬度</h3>
                  <n-input v-model:value="coordinateInput" placeholder="116.397128 或 06EF02E8" />
                  <div class="actions-row">
                    <n-button @click="handleCoordinateToRaw">小数转 808</n-button>
                    <n-button @click="handleRawToCoordinate">808 转小数</n-button>
                  </div>
                  <n-input v-model:value="coordinateOutput" readonly placeholder="结果" />
                </div>
              </n-grid-item>

              <n-grid-item>
                <div class="mini-tool">
                  <h3>808 时间</h3>
                  <n-input v-model:value="timeInput" :placeholder="jtTimePlaceholder" />
                  <div class="actions-row">
                    <n-button @click="handleNowTime">当前时间</n-button>
                    <n-button @click="handleJtTimeToDate">BCD 转时间</n-button>
                  </div>
                  <n-input v-model:value="timeOutput" readonly placeholder="结果" />
                </div>
              </n-grid-item>
            </n-grid>

            <n-alert v-if="fieldError" type="error" class="section-gap">{{ fieldError }}</n-alert>
          </n-card>
        </n-tab-pane>

      </PageTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NCode,
  NCollapse,
  NCollapseItem,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTabPane,
  NTag
} from 'naive-ui'
import {
  bcdToText,
  buildJt808Frame,
  buildJt809Frame,
  coordinateToRaw,
  dateTimeToJtTime,
  hexToText,
  jtTimeToDateTime,
  parseJt808Frames,
  parseJt809Frames,
  rawToCoordinate,
  textToBcd,
  textToHex,
  type Jt808ParseResult,
  type Jt809ParseResult
} from './utils'
import ToolHeader from '@/components/ToolHeader.vue'
import PageTabs from '@/components/PageTabs.vue'
import { useClipboard } from '@/composables/useClipboard'
import { todayAt } from '@/utils/demoTime'

const { copy } = useClipboard()

const buildDemoFrame = () => buildJt808Frame({
  msgIdHex: '0200',
  phone: '123456789012',
  msgSerialNo: 1,
  bodyHex: [
    '00 00 00 01',
    '00 00 00 02',
    '00 BA 7F 0E',
    '07 E4 F1 1C',
    '00 28',
    '00 3C',
    '00 00',
    dateTimeToJtTime(todayAt(9, 30)),
    '01 04 00 00 00 64',
    '02 02 00 7D'
  ].join(' '),
  version: '2013',
  protocolVersion: 1
})
const demoJt809Frame = '5B 00 00 00 00 00 00 00 01 10 01 00 00 00 01 00 00 00 00 00 41 BC 5D'

const parseInput = ref(buildDemoFrame())
const parseResults = ref<Jt808ParseResult[]>([])
const parseError = ref('')

// JT809 解析相关
const jt809ParseInput = ref(demoJt809Frame)
const jt809ParseResults = ref<Jt809ParseResult[]>([])
const jt809ParseError = ref('')

const packetForm = reactive({
  msgIdHex: '0002',
  phone: '123456789012',
  msgSerialNo: 1,
  bodyHex: '',
  version: '2013' as '2013' | '2019',
  protocolVersion: 1
})
const packetOutput = ref('')
const packetError = ref('')

// JT809 组包相关
const jt809PacketForm = reactive({
  msgIdHex: '1001',
  msgSerialNo: 1,
  msgGnssCenterId: 1,
  bodyHex: '',
  versionFlag: 0,
  encryptFlag: 0,
  encryptKey: 0
})
const jt809PacketOutput = ref('')
const jt809PacketError = ref('')

const hexInput = ref('')
const hexOutput = ref('')
const hexError = ref('')
const hexEncoding = ref('UTF-8')

const bcdInput = ref('123456789012')
const bcdOutput = ref('')
const coordinateInput = ref('116.397128')
const coordinateOutput = ref('')
const timeInput = ref('')
const timeOutput = ref('')
const fieldError = ref('')
const jtTimePlaceholder = computed(() => `${dateTimeToJtTime(todayAt(14, 30))} 或 BCD Hex`)


const versionOptions = [
  { label: 'JT808 2013', value: '2013' },
  { label: 'JT808 2019', value: '2019' }
]

const encryptOptions = [
  { label: '未加密', value: 0 },
  { label: '已加密', value: 1 }
]

const encodingOptions = [
  'UTF-8',
  'GBK',
  'GB18030',
  'BIG5',
  'ISO-8859-1',
  'WINDOWS-1252'
].map(value => ({ label: value, value }))

type ParseResult = Jt808ParseResult | Jt809ParseResult

const jt808Summary = computed(() => buildParseSummary(parseResults.value))
const jt809Summary = computed(() => buildParseSummary(jt809ParseResults.value))

const buildParseSummary = (results: ParseResult[]) => {
  const total = results.length
  const checksumPassed = results.filter(item => item.checksum.matched).length
  const abnormal = results.filter(item => item.error || !item.checksum.matched).length
  const withBoundary = results.filter(item => item.validBoundary).length
  const messageTypes = Array.from(new Set(
    results.map(item => item.header ? `${item.header.msgId} ${item.header.msgName}` : '未识别')
  ))
  const typeText = messageTypes.length
    ? `${messageTypes.slice(0, 2).join(' / ')}${messageTypes.length > 2 ? ` +${messageTypes.length - 2}` : ''}`
    : '-'

  return [
    { label: '总包数', value: total },
    {
      label: '校验通过',
      value: checksumPassed,
      status: checksumPassed === total ? 'success' : 'warning'
    },
    {
      label: '异常',
      value: abnormal,
      status: abnormal ? 'error' : 'success'
    },
    { label: '边界完整', value: `${withBoundary}/${total}` },
    { label: '消息类型', value: typeText }
  ]
}

const handleParse = () => {
  parseError.value = ''
  try {
    parseResults.value = parseJt808Frames(parseInput.value)
    if (!parseResults.value.length) parseError.value = '请输入 JT808 Hex 报文'
  } catch (err) {
    parseResults.value = []
    parseError.value = (err as Error).message
  }
}

const loadParseDemo = () => {
  parseInput.value = buildDemoFrame()
  handleParse()
}

const clearParse = () => {
  parseInput.value = ''
  parseResults.value = []
  parseError.value = ''
}

const handleBuildPacket = () => {
  packetError.value = ''
  try {
    packetOutput.value = buildJt808Frame(packetForm)
  } catch (err) {
    packetError.value = (err as Error).message
  }
}

const loadPacketDemo = () => {
  packetForm.msgIdHex = '0002'
  packetForm.phone = '123456789012'
  packetForm.msgSerialNo = 1
  packetForm.bodyHex = ''
  packetForm.version = '2013'
  handleBuildPacket()
}

const copyPacket = async () => {
  await copyText(packetOutput.value)
}

// JT809 处理函数
const handleJt809Parse = () => {
  jt809ParseError.value = ''
  try {
    jt809ParseResults.value = parseJt809Frames(jt809ParseInput.value)
    if (!jt809ParseResults.value.length) jt809ParseError.value = '请输入 JT809 Hex 报文'
  } catch (err) {
    jt809ParseResults.value = []
    jt809ParseError.value = (err as Error).message
  }
}

const loadJt809ParseDemo = () => {
  jt809ParseInput.value = demoJt809Frame
  handleJt809Parse()
}

const clearJt809Parse = () => {
  jt809ParseInput.value = ''
  jt809ParseResults.value = []
  jt809ParseError.value = ''
}

const handleBuildJt809Packet = () => {
  jt809PacketError.value = ''
  try {
    jt809PacketOutput.value = buildJt809Frame(jt809PacketForm)
  } catch (err) {
    jt809PacketError.value = (err as Error).message
  }
}

const loadJt809PacketDemo = () => {
  jt809PacketForm.msgIdHex = '1001'
  jt809PacketForm.msgSerialNo = 1
  jt809PacketForm.msgGnssCenterId = 1
  jt809PacketForm.bodyHex = ''
  jt809PacketForm.versionFlag = 0
  jt809PacketForm.encryptFlag = 0
  jt809PacketForm.encryptKey = 0
  handleBuildJt809Packet()
}

const copyJt809Packet = async () => {
  await copyText(jt809PacketOutput.value)
}


const convertHexToText = () => {
  hexError.value = ''
  try {
    hexOutput.value = hexToText(hexInput.value, hexEncoding.value)
  } catch (err) {
    hexError.value = (err as Error).message
  }
}

const convertTextToHex = () => {
  hexError.value = ''
  try {
    hexOutput.value = textToHex(hexInput.value)
  } catch (err) {
    hexError.value = (err as Error).message
  }
}

const copyHexOutput = async () => {
  await copyText(hexOutput.value)
}

const handleTextToBcd = () => runFieldTool(() => {
  bcdOutput.value = textToBcd(bcdInput.value)
})

const handleBcdToText = () => runFieldTool(() => {
  bcdOutput.value = bcdToText(bcdInput.value)
})

const handleCoordinateToRaw = () => runFieldTool(() => {
  coordinateOutput.value = coordinateToRaw(Number(coordinateInput.value))
})

const handleRawToCoordinate = () => runFieldTool(() => {
  coordinateOutput.value = rawToCoordinate(coordinateInput.value)
})

const handleNowTime = () => runFieldTool(() => {
  const now = new Date()
  timeInput.value = dateTimeToJtTime(now)
  timeOutput.value = now.toLocaleString()
})

const handleJtTimeToDate = () => runFieldTool(() => {
  timeOutput.value = jtTimeToDateTime(timeInput.value)
})

const runFieldTool = (runner: () => void) => {
  fieldError.value = ''
  try {
    runner()
  } catch (err) {
    fieldError.value = (err as Error).message
  }
}

const copyText = (value: string) => {
  copy(value)
}


handleParse()
handleJt809Parse()
convertHexToText()
handleTextToBcd()
handleCoordinateToRaw()
handleNowTime()
</script>

<style scoped>
.tool-container {
  padding: var(--spacing-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-content {
  flex: 1;
  min-height: 0;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(460px, 1.1fr);
  gap: var(--spacing-md);
  align-items: start;
}

.workspace-grid--compact {
  grid-template-columns: minmax(360px, 0.85fr) minmax(420px, 1.15fr);
}

.panel-card,
.result-card {
  border-radius: var(--radius-md);
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}

.result-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.parse-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--spacing-sm);
}

.summary-tile {
  min-height: 70px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.summary-tile span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.summary-tile strong {
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  line-height: 1.35;
  word-break: break-all;
}

.summary-tile--success {
  border-color: rgba(0, 186, 124, 0.38);
  background: rgba(0, 186, 124, 0.08);
}

.summary-tile--warning {
  border-color: rgba(240, 162, 58, 0.42);
  background: rgba(240, 162, 58, 0.1);
}

.summary-tile--error {
  border-color: rgba(244, 33, 46, 0.38);
  background: rgba(244, 33, 46, 0.08);
}

.section-gap {
  margin-bottom: var(--spacing-md);
}

.field-list {
  margin-top: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.32fr) minmax(0, 1fr) minmax(150px, 0.52fr);
  gap: var(--spacing-sm);
  align-items: start;
  padding: 9px 12px;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.field-row:last-child {
  border-bottom: none;
}

.field-label {
  color: var(--color-text-secondary);
  font-weight: 700;
}

.field-value {
  font-family: var(--font-mono);
  word-break: break-all;
  color: var(--color-text-primary);
}

.field-remark {
  color: var(--color-text-tertiary);
  min-width: 0;
}

.field-tools {
  max-width: 100%;
}

.mini-tool {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  min-height: 180px;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
}

.mini-tool h3 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

:deep(.n-card__content) {
  min-width: 0;
}

@media (max-width: 1100px) {
  .workspace-grid,
  .workspace-grid--compact {
    grid-template-columns: 1fr;
  }

  .parse-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .tool-container {
    padding: var(--spacing-md);
  }

  .field-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .parse-summary {
    grid-template-columns: 1fr;
  }
}

</style>
