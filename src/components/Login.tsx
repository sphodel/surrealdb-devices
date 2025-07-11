import React, { useState } from 'react';
import { useSurrealClient } from '../api/SurrealProvider';
import { Form, Input, Button, Typography, Alert} from 'antd';

interface LoginProps {
  onLogin: (token: string) => void;
}

const { Title } = Typography;

type LoginFormValues = {
  user: string;
  pass: string;
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const client = useSurrealClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const onFinish =  (values: LoginFormValues) => {
    setLoading(true);
    setError('');
    const params = { username: values.user, password: values.pass };
    client.signin(params).then(token=>{
      localStorage.setItem('surrealist_token', token );
      onLogin(token );
    }).catch(_=>{
      setError(`登录失败，请检查用户名和密码`);
    }).finally(()=>{
      setLoading(false);
    });
      

  };

  return (
    <div style={{
      maxWidth: 400, margin: '100px auto', padding: 32, background: '#fff',
      borderRadius: 8, boxShadow: '0 2px 8px #f0f1f2'
    }}>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>XPlayer管理后台</Title>

      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item label="用户名" name="user" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder="用户名" autoComplete="username" />
        </Form.Item>
        <Form.Item label="密码" name="pass" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="密码" autoComplete="current-password" />
        </Form.Item>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Login;
