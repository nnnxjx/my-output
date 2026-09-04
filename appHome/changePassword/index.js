const template = require("./index.html");
const loginCtrl = require("controllers/loginController");
var encodeUtils = require("utils/encodeUtils");
var AES = require("utils/AES");
require("./index.scss");
const eventHelper = require("utils/eventHelper");

const comm = Vue.extend({
  template: template,
  data: function () {
    var validatePass = (rule, value, callback) => {
      if (value === "" || value.trim().length < 1) {
        callback(new Error("请输入密码，密码不能包含空格"));
      } else if (String(value).length < 8) {
        callback(new Error("密码长度至少8位"));
      } else if (
        !/^.*(?=.{8,})(?=.*\d)(?=.*[A-Za-z])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/.test(
          value
        )
      ) {
        callback(new Error("密码必须包含数字、大小写字母和特殊字符"));
      } else {
        callback();
      }
    };

    var validatePass2 = (rule, value, callback) => {
      if (value === "" || value.trim().length < 1) {
        callback(new Error("请再次输入密码，密码不能包含空格"));
      } else if (value !== this.form.newPassword) {
        callback(new Error("两次输入密码不一致!"));
      } else {
        callback();
      }
    };

    return {
      visible: false,
      loading: false,
      // 组件配置
      title: "修改密码",
      showCloseButton: true,
      showCancelButton: true,
      maskClosable: true,
      form: {
        loginAccount: "",
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      },
      rules: {
        oldPassword: [
          { required: true, message: "请输入原密码", trigger: "blur" },
        ],
        newPassword: [
          { required: true, validator: validatePass, trigger: "blur" },
        ],
        confirmPassword: [
          { required: true, validator: validatePass2, trigger: "blur" },
        ],
      },
      // 密码显示状态
      passwordType: {
        oldPassword: "password",
        newPassword: "password",
        confirmPassword: "password",
      },
    };
  },

  watch: {
    visible(val) {
      if (!val) {
        this.resetForm();
      }
    },
  },
  methods: {
    // 显示组件
    show(options = {}) {
      // 设置组件配置
      if (options.title !== undefined) {
        this.title = options.title;
      }
      if (options.showCloseButton !== undefined) {
        this.showCloseButton = options.showCloseButton;
      }
      if (options.showCancelButton !== undefined) {
        this.showCancelButton = options.showCancelButton;
      }
      if (options.maskClosable !== undefined) {
        this.maskClosable = options.maskClosable;
      }

      this.visible = true;

      // 设置用户数据（保持原有功能）
      if (options.userName) {
        this.form.loginAccount = options.userName;
      }
      if (options.password) {
        this.form.oldPassword = options.password;
      }
    },

    // 隐藏组件
    hide() {
      this.visible = false;
    },

    // 重置表单
    resetForm() {
      this.form.oldPassword = "";
      this.form.newPassword = "";
      this.form.confirmPassword = "";

      // 重置密码显示状态
      this.passwordType = {
        oldPassword: "password",
        newPassword: "password",
        confirmPassword: "password",
      };

      if (this.$refs.form) {
        this.$refs.form.clearValidate();
      }
    },

    // 切换密码显示/隐藏
    togglePassword(field) {
      this.passwordType[field] =
        this.passwordType[field] === "password" ? "text" : "password";
    },

    // 提交表单
    handleSubmit() {
      this.$refs.form.validate((valid) => {
        if (valid) {
          this.updatePassword();
        } else {
          this.$dialog.toast({
            mes: "请检查输入信息",
            icon: "error",
            timeout: 1500,
          });
        }
      });
    },

    // 调用修改密码API
    async updatePassword() {
      if (this.loading) return;
      this.loading = true;
      const params = {
        oldPassword: this.form.oldPassword,
        newPassword: this.form.newPassword,
        loginName:this.form.loginAccount,
      };
      loginCtrl.updatePasswordV2(
        params,
        (result) => {
          this.loading = false;
          // 先隐藏当前弹窗
          this.hide();
          // 延迟显示成功提示，确保弹窗已完全隐藏
          setTimeout(() => {
            this.$dialog.toast({
              mes: "密码修改成功",
              icon: "success",
              timeout: 1500,
              callback: () => {
                window.location.reload();
              },
            });
          }, 100);
        },
        (error) => {
          this.loading = false;
          // 先隐藏当前弹窗避免遮挡
          this.hide();
          // 延迟显示错误提示
          setTimeout(() => {
            this.$dialog.toast({
              mes: error.msg || "密码修改失败",
              icon: "error",
              timeout: 1500,
            });
          }, 100);
        }
      );
    },

    // 关闭弹窗
    handleClose() {
      this.hide();
    },

    // 处理遮罩点击事件
    handleMaskClick() {
      if (this.maskClosable) {
        this.hide();
      }
    },
  },

  mounted() {
    eventHelper.on("showChangePassword", (options) => {
      this.show(options);
    });
    this.form.loginAccount = localStorage.getItem("cescUserName");
  },
});

module.exports = comm;