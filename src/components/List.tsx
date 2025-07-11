import React, { useEffect, useState } from "react";
import { useSurrealClient } from "../api/SurrealProvider";
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Menu,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Switch,
  Select,
} from "antd";
import dayjs from "dayjs";
import { Uuid } from "surrealdb";

const { Sider, Content } = Layout;

interface DeviceData {
  id?: string;
  created_at: string;
  hostname: string;
  mac: string;
  valid: boolean;
  features: string[];
  mark: string;
  [key: string]: any;
}

const FEATURES_OPTIONS = [
  { label: "QQMusic", value: "QQMusic" },
  { label: "Tidal", value: "Tidal" },
  { label: "USB", value: "USB" },
];

const List: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const client = useSurrealClient();
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [data, setData] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] =
    Form.useForm<Pick<DeviceData, "valid" | "features" | "mark">>();
  const [editingRecord, setEditingRecord] = useState<DeviceData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const result = await client.query<any>("INFO FOR DB");
        const dbInfo = result?.[0] as { tables?: Record<string, unknown> };
        const tableList =
          dbInfo && dbInfo.tables ? Object.keys(dbInfo.tables) : [];
        setTables(tableList);
        if (tableList.length > 0) setSelectedTable(tableList[0]);
      } catch (err) {
        console.error("获取表失败", err);
        setTables([]);
      }
    };
    void fetchTables();
  }, [client]);

  useEffect(() => {
    if (!selectedTable) return;

    let queryUuid: Uuid;
    let isMounted = true;

    const fetchAndSubscribe = async () => {
      try {
        setLoading(true);
        const initialData = await client.select<DeviceData>(selectedTable);
        if (isMounted) {
          setData(initialData);
          setLoading(false);
        }
        queryUuid = await client.live<DeviceData>(
          selectedTable,
          (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CLOSE', result: unknown) => {
            if (!isMounted) return;
            if (action === 'CLOSE') {
              console.log(`Live query closed: ${result as 'killed' | 'disconnected'}`);
              return;
            }
            const record = result as DeviceData;
            if (!record || !record.id) {
              return;
            }
            setData((prev) => {
              const id = record.id;
              switch (action) {
                case "CREATE":
                  return prev.some(item => item.id === id) ? prev : [...prev, record];
                case "UPDATE":
                  return prev.map((item) => (item.id === id ? record : item));
                case "DELETE":
                  return prev.filter((item) => item.id !== id);
                default:
                  return prev;
              }
            });
          },
        );
      } catch (e) {
        console.error("Live subscription or initial fetch failed", e);
        if (isMounted) setLoading(false);
      }
    };

    void fetchAndSubscribe();
    return () => {
      isMounted = false;
      if (queryUuid) {
        void client.kill(queryUuid);
      }
    };
  }, [selectedTable, client]);


  const getFormattedId = (idObj: { tb: string; id: string }) => {
    if (idObj && typeof idObj === "object" && idObj.tb && idObj.id) {
      return `${idObj.id}`;
    }
    return String(idObj);
  };

  const allKeys = [
    "hostname",
    "mac",
    "features",
    "mark",
    "valid",
    "created_at"
  ];

  const handleDelete = (record: DeviceData) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这条数据吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      async onOk() {
        try {
          if (record && record.id) {
            await client.delete(record.id);
          }

          void message.success("删除成功");
          setData((prev) => prev.filter((item) => item.id !== record.id));
        } catch {
          void message.error("删除失败");
        }
      },
    });
  };

  const handleEdit = (record: DeviceData) => {
    setEditingRecord(record);
    setEditModalOpen(true);
    editForm.setFieldsValue({
      valid: record.valid,
      features: record.features || [],
      mark: record.mark || "",
    });
  };

  const handleEditOk = () => {
    editForm
      .validateFields()
      .then(async (values) => {
        if (editingRecord && editingRecord.id) {
          await client.merge(editingRecord.id, {
            valid: values.valid,
            features: [...values.features].sort(),
            mark: values.mark,
          });
          void message.success("更新成功");
          setEditModalOpen(false);
          setEditingRecord(null);
          setData((prev) =>
            prev.map((item) =>
              item.id === editingRecord.id
                ? { ...item, ...values }
                : item
            )
          );
        }
      })
      .catch((e) => {
        console.error("更新失败", e);
        void message.error("更新失败");
      });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: "批量删除",
      content: `确定要删除选中的 ${selectedRowKeys.length} 条数据吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      async onOk() {
        try {
          await Promise.all(
            selectedRowKeys.map((id) => client.delete(id as string)),
          );
          void message.success("批量删除成功");
          setData((prev) =>
            prev.filter((item) => !selectedRowKeys.includes(item.id ?? ""))
          );
          setSelectedRowKeys([]);
        } catch {
          void message.error("批量删除失败");
        }
      },
    });
  };

  const columns = [
    ...allKeys.map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (
        value: { tb: string; id: string } | string | boolean | string[],
      ) => {
        if (key === "id") {
          return getFormattedId(value as { tb: string; id: string });
        }
        if (key === "valid") {
          return value ? (
            <CheckCircleTwoTone twoToneColor="#52c41a" />
          ) : (
            <CloseCircleTwoTone twoToneColor="#ff4d4f" />
          );
        }
        if (key === "features") {
          return Array.isArray(value) ? [...value].sort().join(", ") : "";
        }

        if (key === "created_at") {
          return (typeof value === "string" || typeof value === "number")
            ? dayjs(value).format("YYYY-MM-DD HH:mm:ss")
            : "";
        }
        if (key === "mark") {
          return typeof value === "string" ? value : "";
        }
        return String(value);
      },
    })),
    {
      title: "操作",
      key: "action",
      fixed: "right" as const,
      width: 120,
      render: (_: any, record: DeviceData) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={180} style={{ background: "#fff" }}>
        <div style={{ padding: 16, textAlign: "center" }}>
          <Button
            type="primary"
            danger
            onClick={() => {
              localStorage.removeItem("surrealist_token");
              onLogout();
            }}
            style={{ width: "100%" }}
          >
            退出登录
          </Button>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedTable]}
          onClick={({ key }: { key: string }) => setSelectedTable(key)}
          items={tables.map((table) => ({ key: table, label: table }))}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: 24, background: "#fff", padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>{selectedTable} 数据</h2>
            <Space>
              <Input
                prefix={<SearchOutlined />}
                placeholder="搜索"
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 200 }}
              />
              <Button
                type="primary"
                danger
                disabled={selectedRowKeys.length === 0}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            </Space>
          </div>
          <Table
            rowKey={(record: DeviceData) => record.id || JSON.stringify(record)}
            columns={columns}
            dataSource={data}
            loading={loading}
            bordered
            size="middle"
            scroll={{ x: true }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
          />
          <Modal
            title={`编辑${selectedTable}数据`}
            open={editModalOpen}
            onCancel={() => setEditModalOpen(false)}
            onOk={handleEditOk}
            okText="保存"
            cancelText="取消"
          >
            <Form form={editForm} layout="vertical">
              <Form.Item name="valid" label="valid" valuePropName="checked">
                <Switch checkedChildren="有效" unCheckedChildren="无效" />
              </Form.Item>
              <Form.Item name="features" label="features">
                <Select
                  mode="multiple"
                  options={FEATURES_OPTIONS}
                  placeholder="请选择功能"
                  allowClear
                />
              </Form.Item>
              <Form.Item name="mark" label="mark">
                <Input placeholder="请输入备注" />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
};

export default List;
