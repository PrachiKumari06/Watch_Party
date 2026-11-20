import React from "react";
import {
  Modal,
  Button,
  Avatar,
  HoverCard,
  Text,
  Alert,
  TextInput,
  PasswordInput,
} from "@mantine/core";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { serverPath } from "../../utils/utils";
import { ManageSubButton } from "../SubscribeButton/SubscribeButton";
import config from "../../config";
import { MetadataContext } from "../../MetadataContext";
import {
  IconBrandGravatar,
  IconCircleCheck,
  IconCircleCheckFilled,
  IconKeyFilled,
  IconLogout,
  IconMailFilled,
  IconTrashFilled,
} from "@tabler/icons-react";

export class ProfileModal extends React.Component<{
  close: () => void;
  userImage: string | null;
}> {
  static contextType = MetadataContext;
  declare context: React.ContextType<typeof MetadataContext>;
  public state = {
    resetDisabled: false,
    verifyDisabled: false,
    changeEmailOpen: false,
    changeEmailLoading: false,
    changeEmailError: "",
    newEmail: "",
    currentPassword: "",
    needsReauth: false,
    deleteConfirmOpen: false,
  };

  onSignOut = () => {
    firebase.auth().signOut();
    window.localStorage.removeItem("watchparty-loginname");
    window.location.reload();
  };

  resetPassword = async () => {
    try {
      if (this.context.user?.email) {
        await firebase.auth().sendPasswordResetEmail(this.context.user.email);
        this.setState({ resetDisabled: true });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  verifyEmail = async () => {
    try {
      if (this.context.user) {
        await this.context.user.sendEmailVerification();
        this.setState({ verifyDisabled: true });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  changeEmail = async () => {
    const user = this.context.user;
    const newEmail = this.state.newEmail.trim();
    if (!user || !newEmail) {
      return;
    }
    if (newEmail === user.email) {
      this.setState({
        changeEmailError:
          "New email must be different from your current email.",
      });
      return;
    }
    this.setState({ changeEmailError: "", changeEmailLoading: true });
    try {
      if (this.state.needsReauth && user.email) {
        const credential = firebase.auth.EmailAuthProvider.credential(
          user.email,
          this.state.currentPassword,
        );
        await user.reauthenticateWithCredential(credential);
      }
      await user.updateEmail(newEmail);
      const token = await user.getIdToken(true);
      await fetch(serverPath + "/updateEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          token,
          email: newEmail,
        }),
      });
      this.setState({
        changeEmailOpen: false,
        changeEmailLoading: false,
        verifyDisabled: false,
        needsReauth: false,
        currentPassword: "",
      });
    } catch (e: any) {
      if (e?.code === "auth/requires-recent-login" && !this.state.needsReauth) {
        this.setState({
          needsReauth: true,
          changeEmailLoading: false,
          changeEmailError:
            "Please enter your current password to confirm this change.",
        });
        return;
      }
      this.setState({
        changeEmailError: e.message,
        changeEmailLoading: false,
      });
    }
  };

  deleteAccountConfirm = () => {
    this.setState({ deleteConfirmOpen: true });
  };

  deleteAccount = async () => {
    const token = await this.context.user?.getIdToken();
    await fetch(serverPath + "/deleteAccount", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid: this.context.user?.uid, token }),
    });
    window.location.reload();
  };

  render() {
    const { close, userImage } = this.props;
    return (
      <Modal opened onClose={close} centered>
        <Modal
          opened={this.state.changeEmailOpen}
          onClose={() => {
            this.setState({
              changeEmailOpen: false,
              changeEmailError: "",
              needsReauth: false,
              currentPassword: "",
            });
          }}
          title="Change Email"
          centered
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              this.changeEmail();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            {this.state.changeEmailError && (
              <Alert color="red" title="Error">
                {this.state.changeEmailError}
              </Alert>
            )}
            <TextInput
              label="New Email"
              placeholder="New Email"
              type="email"
              required
              value={this.state.newEmail}
              onChange={(e) => this.setState({ newEmail: e.target.value })}
            />
            {this.state.needsReauth && (
              <PasswordInput
                label="Current Password"
                placeholder="Current Password"
                required
                value={this.state.currentPassword}
                onChange={(e) =>
                  this.setState({ currentPassword: e.target.value })
                }
              />
            )}
            <Button type="submit" loading={this.state.changeEmailLoading}>
              Change Email
            </Button>
          </form>
        </Modal>
        <Modal
          opened={this.state.deleteConfirmOpen}
          onClose={() => {
            this.setState({ deleteConfirmOpen: false });
          }}
          title="Delete Your Account"
        >
          <p>
            Are you sure you want to delete your account? This can't be undone.
          </p>
          <p>
            Note: If you have an active subscription, deleting your account will
            NOT automatically cancel it and you will need to contact
            support@watchparty.me to cancel.
          </p>
          <div style={{ display: "flex", gap: "4px" }}>
            <Button
              onClick={async () => {
                await this.deleteAccount();
              }}
            >
              Yes
            </Button>
            <Button
              onClick={() => {
                this.setState({ deleteConfirmOpen: false });
              }}
            >
              No
            </Button>
          </div>
        </Modal>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Avatar src={userImage} />
          {this.context.user?.email}
          {this.context.user?.emailVerified && (
            <IconCircleCheckFilled
              title="This email is verified"
              color="green"
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            margin: "10px",
          }}
        >
          <Button
            component="a"
            leftSection={<IconBrandGravatar />}
            href="https://gravatar.com"
            target="_blank"
            color="blue"
          >
            Edit Gravatar
          </Button>
          <Button
            disabled={
              this.context.user?.emailVerified || this.state.verifyDisabled
            }
            leftSection={<IconCircleCheck />}
            color="purple"
            onClick={this.verifyEmail}
          >
            Verify Email
          </Button>
          {this.context.user?.providerData?.some(
            (p) => p?.providerId === "password",
          ) && (
              <Button
                leftSection={<IconMailFilled />}
                color="teal"
                onClick={() =>
                  this.setState({
                    changeEmailOpen: true,
                    newEmail: "",
                    currentPassword: "",
                    changeEmailError: "",
                    needsReauth: false,
                  })
                }
              >
                Change Email
              </Button>
            )}
          {this.context.isSubscriber && <ManageSubButton />}
          <Button
            disabled={this.state.resetDisabled}
            leftSection={<IconKeyFilled />}
            color="green"
            onClick={this.resetPassword}
          >
            Reset Password
          </Button>
          <Button
            leftSection={<IconTrashFilled />}
            color="red"
            onClick={this.deleteAccountConfirm}
          >
            Delete Account
          </Button>
          <Button leftSection={<IconLogout />} onClick={this.onSignOut}>
            Sign out
          </Button>
        </div>
      </Modal>
    );
  }
}
